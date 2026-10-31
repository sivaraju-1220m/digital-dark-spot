
import os
import json
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from tavily import TavilyClient
from google import genai

load_dotenv()

GEMINI_MODEL = "gemini-3.5-flash-lite"

app = FastAPI(
    title="DarkSpot Research Intelligence API",
    description="AI-assisted research intelligence and evidence gap detection.",
    version="3.0.0"
)


# ---------------------------------------------------------
# CORS CONFIGURATION
# Supports local development and the deployed frontend.
# Set FRONTEND_URLS on Render after the frontend is deployed.
# Multiple origins can be separated with commas.
# ---------------------------------------------------------

frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_URLS", "").split(",")
    if origin.strip()
]

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *frontend_origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    question: str = Field(min_length=5, max_length=1000)
    sources: list[str] = Field(default_factory=list)


# ---------------------------------------------------------
# SOURCE ASSESSMENT
# These are preliminary screening labels, NOT credibility
# ratings or proof of factual accuracy.
# ---------------------------------------------------------

SOCIAL_DOMAINS = {
    "facebook.com", "reddit.com", "x.com", "twitter.com",
    "instagram.com", "tiktok.com", "quora.com"
}

RESEARCH_DOMAINS = {
    "nature.com", "sciencedirect.com", "springer.com",
    "pubmed.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov",
    "ieeexplore.ieee.org", "arxiv.org"
}

RESEARCH_ORGANIZATION_DOMAINS = {
    "icct.org", "theicct.org"
}

ESTABLISHED_DOMAINS = {
    "eea.europa.eu", "energy.gov", "energy.gov.au",
    "who.int", "un.org", "iea.org", "worldbank.org"
}

OPINION_DOMAINS = {
    "mackinac.org"
}

INSTITUTIONAL_SUFFIXES = (
    ".gov", ".gov.in", ".gov.au", ".gov.uk",
    ".edu", ".ac.in", ".ac.uk"
)


def domain_matches(domain, domains):
    return any(
        domain == item or domain.endswith("." + item)
        for item in domains
    )


def get_source_assessment(url, title="", content=""):
    try:
        parsed = urlparse(url)
        domain = (parsed.hostname or "").lower().strip(".")

        if not domain or parsed.scheme not in ("http", "https"):
            return {
                "source_quality": "Unclassified",
                "quality_reason": "A valid HTTP or HTTPS domain was not identified.",
                "analysis_priority": 3
            }

        if domain_matches(domain, SOCIAL_DOMAINS):
            return {
                "source_quality": "User-generated",
                "quality_reason": (
                    "Social-media or user-generated platform. "
                    "Independent verification and primary evidence are needed."
                ),
                "analysis_priority": 4
            }

        if domain_matches(domain, OPINION_DOMAINS):
            return {
                "source_quality": "Opinion / policy commentary",
                "quality_reason": (
                    "Policy or commentary publisher. Check the author's "
                    "evidence, perspective and cited research."
                ),
                "analysis_priority": 3
            }

        if domain.endswith(INSTITUTIONAL_SUFFIXES):
            return {
                "source_quality": "Research / institutional",
                "quality_reason": (
                    "Government or educational domain indicator. "
                    "Inspect the specific publication, evidence and methodology."
                ),
                "analysis_priority": 1
            }

        if domain_matches(domain, RESEARCH_DOMAINS):
            return {
                "source_quality": "Research / institutional",
                "quality_reason": (
                    "Recognized academic publisher or research repository domain. "
                    "The specific article's peer-review status and methodology "
                    "still need to be checked."
                ),
                "analysis_priority": 1
            }

        if domain_matches(domain, RESEARCH_ORGANIZATION_DOMAINS):
            return {
                "source_quality": "Established organization",
                "quality_reason": (
                    "Recognized specialist research organization domain. "
                    "Inspect the specific report, funding context and methodology."
                ),
                "analysis_priority": 1
            }

        if domain_matches(domain, ESTABLISHED_DOMAINS):
            return {
                "source_quality": "Established organization",
                "quality_reason": (
                    "Recognized institutional or international organization domain. "
                    "Inspect the specific publication and supporting evidence."
                ),
                "analysis_priority": 1
            }

        title_path = ((title or "") + " " + (parsed.path or "")).lower()

        opinion_indicators = (
            "/opinion/", "/editorial/", "/commentary/",
            "/op-ed/", "opinion", "editorial", "commentary"
        )

        if any(term in title_path for term in opinion_indicators):
            return {
                "source_quality": "Opinion / policy commentary",
                "quality_reason": (
                    "Possible opinion or commentary format based on title or URL. "
                    "Confirm the article type and examine its evidence."
                ),
                "analysis_priority": 3
            }

        return {
            "source_quality": "Unassessed",
            "quality_reason": (
                "Publisher or evidence quality has not been established "
                "from the domain alone. Inspect the author, publication type "
                "and supporting evidence."
            ),
            "analysis_priority": 2
        }

    except Exception:
        return {
            "source_quality": "Unclassified",
            "quality_reason": "The source domain could not be assessed.",
            "analysis_priority": 3
        }


# ---------------------------------------------------------
# SOURCE ID AND AGREEMENT VALIDATION
# ---------------------------------------------------------

def publisher_domain(url):
    """
    Return a conservative publisher-domain identifier.
    This is a screening heuristic, not proof of ownership
    or research independence.
    """
    try:
        host = (urlparse(url).hostname or "").lower().strip(".")
        if not host:
            return None

        parts = host.split(".")

        # Handle common multi-part public suffixes.
        if len(parts) >= 3 and ".".join(parts[-2:]) in {
            "co.uk", "org.uk", "ac.uk", "gov.uk",
            "com.au", "net.au", "org.au", "edu.au",
            "co.in", "firm.in", "net.in", "org.in",
            "gen.in", "ind.in"
        }:
            return ".".join(parts[-3:])

        return ".".join(parts[-2:]) if len(parts) >= 2 else host

    except Exception:
        return None


def valid_source_ids(ids, source_map):
    if not isinstance(ids, list):
        return []

    result = []
    for source_id in ids:
        if (
            isinstance(source_id, str)
            and source_id in source_map
            and source_id not in result
        ):
            result.append(source_id)

    return result


def validate_analysis(analysis, sources):
    """
    Validate model output against retrieved source IDs.
    Remove unsupported references and apply conservative
    rules to agreement claims.
    """
    if not isinstance(analysis, dict):
        raise ValueError("AI returned an invalid analysis structure.")

    source_map = {source["id"]: source for source in sources}

    list_fields = [
        "key_claims",
        "agreements",
        "potential_conflicts",
        "evidence_gaps",
        "unanswered_questions",
        "verification_checklist",
        "limitations"
    ]

    for field in list_fields:
        if not isinstance(analysis.get(field), list):
            analysis[field] = []

    # Claims must cite at least one real retrieved source.
    clean_claims = []

    for claim in analysis["key_claims"]:
        if not isinstance(claim, dict):
            continue

        ids = valid_source_ids(claim.get("source_ids"), source_map)
        if not ids:
            continue

        claim["source_ids"] = ids
        clean_claims.append(claim)

    analysis["key_claims"] = clean_claims

    # Agreements require at least two eligible sources from
    # different publisher domains. This does NOT prove independence.
    clean_agreements = []

    eligible_categories = {
        "Research / institutional",
        "Established organization"
    }

    for agreement in analysis["agreements"]:
        if not isinstance(agreement, dict):
            continue

        ids = valid_source_ids(
            agreement.get("source_ids"),
            source_map
        )

        eligible_ids = [
            source_id for source_id in ids
            if source_map[source_id].get("source_quality")
            in eligible_categories
        ]

        domains = {
            publisher_domain(source_map[source_id]["url"])
            for source_id in eligible_ids
        }
        domains.discard(None)

        if len(eligible_ids) < 2 or len(domains) < 2:
            continue

        agreement["source_ids"] = eligible_ids
        clean_agreements.append(agreement)

    analysis["agreements"] = clean_agreements

    # Conflicts can include opinion sources, but all cited IDs
    # must exist in the retrieved source set.
    clean_conflicts = []

    for conflict in analysis["potential_conflicts"]:
        if not isinstance(conflict, dict):
            continue

        ids = valid_source_ids(conflict.get("source_ids"), source_map)
        if len(ids) < 2:
            continue

        conflict["source_ids"] = ids
        clean_conflicts.append(conflict)

    analysis["potential_conflicts"] = clean_conflicts

    # Sanitize the remaining structured sections.
    for field in (
        "evidence_gaps",
        "verification_checklist"
    ):
        analysis[field] = [
            item for item in analysis[field]
            if isinstance(item, dict)
        ]

    analysis["unanswered_questions"] = [
        item for item in analysis["unanswered_questions"]
        if isinstance(item, str) and item.strip()
    ]

    analysis["limitations"] = [
        item for item in analysis["limitations"]
        if isinstance(item, str) and item.strip()
    ]

    return analysis


# ---------------------------------------------------------
# GEMINI ANALYSIS
# ---------------------------------------------------------

def analyze_with_gemini(question, sources):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    client = genai.Client(api_key=api_key)

    source_text = ""

    for source in sources:
        source_text += (
            f"\nSOURCE ID: {source['id']}\n"
            f"TITLE: {source['title']}\n"
            f"URL: {source['url']}\n"
            f"SOURCE CATEGORY: {source['source_quality']}\n"
            f"SOURCE ASSESSMENT: {source['quality_reason']}\n"
            f"CONTENT: {source['content'][:4000]}\n"
            "--------------------\n"
        )

    prompt = f"""
You are DarkSpot, a careful research intelligence assistant.

RESEARCH QUESTION:
{question}

RETRIEVED SOURCES:
{source_text}

Analyze ONLY the supplied source content.

EVIDENCE AND ACCURACY RULES:

1. Never invent facts, quotations, statistics, sources or citations.
2. Every factual claim must cite one or more supplied source IDs.
3. Domain-based categories are preliminary screening labels,
   not verified credibility ratings.
4. A research publisher domain does not prove peer review.
5. An institutional domain does not guarantee factual accuracy.
6. Distinguish research, primary data, institutional reports,
   opinion, advocacy, commentary and general blogs.
7. Do not present an opinion as an established scientific finding.
8. Do not make claims broader than the evidence.
9. Preserve relevant dates, locations, populations and conditions.
10. Missing information is an evidence gap, not proof of falsehood.
11. Search relevance is not source credibility.

KEY CLAIMS:

12. Include only substantive claims relevant to the question.
13. Avoid repeating the same claim in different wording.
14. Prefer precise claims with explicit conditions and context.
15. The support field must accurately describe what the cited
    source says, not what you think it should say.

AGREEMENTS:

16. An agreement means that at least two sources support the
    same substantive finding.
17. Do not treat two URLs as proof of independent research.
18. Check whether sources appear to rely on the same study,
    dataset, report or cited authority.
19. Do not count opinion/commentary or user-generated material
    as independent research confirmation.
20. Institutional reports may support a finding, but describe
    their publication type accurately.
21. If source independence cannot be established from the
    supplied content, do not claim independent confirmation.
22. Do not force agreements. Return an empty array if evidence
    is insufficient.
23. Do not combine claims that are related but not equivalent.

CONFLICTS:

24. Different numbers are not automatically contradictions.
25. Compare metrics, populations, timeframes, geography,
    assumptions, conditions and methodologies.
26. Distinguish a genuine evidence disagreement from different
    contexts or publication perspectives.
27. An opinion article disagreeing with a research paper does
    not establish a scientific conflict by itself.
28. Explain what additional evidence is required to resolve
    each potential conflict.

EVIDENCE GAPS:

29. Identify missing evidence that materially affects the answer.
30. Explain why each gap matters.
31. Do not invent gaps merely because a topic is not mentioned.
32. Prioritize gaps according to their impact on the conclusion.

VERIFICATION:

33. Recommend specific checks that can actually be performed.
34. Do not claim that a source was verified when it was not.
35. Explicitly state limitations of the supplied material.
36. If evidence is weak or insufficient, say so.

Return ONLY valid JSON in this exact structure:

{{
  "key_claims": [
    {{
      "claim": "Specific claim supported by the sources",
      "source_ids": ["S1"],
      "support": "What the source actually says"
    }}
  ],
  "agreements": [
    {{
      "finding": "Substantive finding supported by multiple eligible sources",
      "source_ids": ["S1", "S2"]
    }}
  ],
  "potential_conflicts": [
    {{
      "issue": "Difference or potential disagreement",
      "source_ids": ["S1", "S2"],
      "explanation": "Context, methodology and evidence differences",
      "verification_needed": "What should be checked"
    }}
  ],
  "evidence_gaps": [
    {{
      "gap": "Missing evidence or information",
      "importance": "High, Medium, or Low",
      "reason": "Why this matters"
    }}
  ],
  "unanswered_questions": [
    "Question that needs further research"
  ],
  "verification_checklist": [
    {{
      "task": "Specific verification task",
      "priority": "High, Medium, or Low"
    }}
  ],
  "limitations": [
    "Limitations of the available evidence"
  ]
}}
"""

    response = client.interactions.create(
        model=GEMINI_MODEL,
        input=prompt
    )

    output = response.output_text

    if not output:
        raise ValueError("Gemini returned an empty response.")

    cleaned = output.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        cleaned = cleaned.rsplit("```", 1)[0].strip()

    analysis = json.loads(cleaned)

    return validate_analysis(analysis, sources)


# ---------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------

@app.get("/")
def home():
    return {
        "project": "DarkSpot",
        "message": "Research Intelligence API is running!",
        "status": "online",
        "version": "3.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/connection-test")
def connection_test():
    return {
        "connected": True,
        "message": "Frontend can communicate with DarkSpot backend!"
    }


@app.post("/api/research")
def research(request: ResearchRequest):
    tavily_key = os.getenv("TAVILY_API_KEY")

    if not tavily_key:
        raise HTTPException(
            status_code=500,
            detail="Tavily API key is not configured."
        )

    # Step 1: Retrieve web sources.
    try:
        client = TavilyClient(api_key=tavily_key)

        response = client.search(
            query=request.question,
            search_depth="advanced",
            max_results=7,
            include_answer=False
        )

        results = response.get("results", [])
        assessed_results = []

        for item in results:
            url = item.get("url") or ""
            title = item.get("title") or "Untitled source"
            content = item.get("content") or ""

            assessment = get_source_assessment(
                url,
                title,
                content
            )

            assessed_results.append({
                "title": title,
                "url": url,
                "content": content,
                "score": item.get("score"),
                **assessment
            })

        assessed_results.sort(
            key=lambda item: (
                item["analysis_priority"],
                -(item["score"] or 0)
            )
        )

        formatted_sources = []

        for i, item in enumerate(assessed_results):
            formatted_sources.append({
                "id": f"S{i + 1}",
                **item
            })

    except Exception as exc:
        print("Tavily search error:", str(exc))
        raise HTTPException(
            status_code=502,
            detail=(
                "Web search failed. Check the Tavily API key "
                "and account limits."
            )
        )

    # Step 2: Analyze retrieved sources.
    analysis = None
    analysis_status = "unavailable"
    analysis_message = None

    if formatted_sources:
        try:
            analysis = analyze_with_gemini(
                request.question,
                formatted_sources
            )
            analysis_status = "success"

        except json.JSONDecodeError:
            analysis_message = (
                "AI returned unreadable analysis. Please retry."
            )

        except Exception as exc:
            print("Gemini analysis error:", str(exc))
            analysis_message = (
                "AI analysis is temporarily unavailable. "
                "Your web search results are still available."
            )
    else:
        analysis_message = (
            "No search results were found to analyze."
        )

    return {
        "status": "success",
        "question": request.question,
        "sources": formatted_sources,
        "total_sources": len(formatted_sources),
        "analysis_status": analysis_status,
        "analysis": analysis,
        "analysis_message": analysis_message
    }
