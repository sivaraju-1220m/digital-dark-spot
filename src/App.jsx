
import { useState, useEffect } from "react";
import {
  Search, LayoutDashboard, History, Bookmark,
  Settings, HelpCircle, ArrowUpRight, ShieldCheck,
  Sparkles, Menu, CheckCircle2, AlertTriangle,
  FileSearch, ListChecks, Lightbulb,
  MessageCircleQuestion, Brain
} from "lucide-react";
import "./App.css";

// Uses Render backend in production and localhost during development.
const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function SourceReferences({ ids, sources }) {
  if (!Array.isArray(ids) || ids.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "7px",
      marginTop: "12px"
    }}>
      {ids.map((id) => {
        const source = sources.find((item) => item.id === id);

        return (
          <a
            key={id}
            href={source?.url || "#"}
            target={source?.url ? "_blank" : undefined}
            rel="noreferrer"
            style={{
              padding: "5px 9px",
              background: "#edf3ff",
              color: "#2458bd",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            {id} ↗
          </a>
        );
      })}
    </div>
  );
}

function AnalysisSection({
  title,
  subtitle,
  icon: Icon,
  items,
  emptyMessage,
  children
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section style={{
      background: "#ffffff",
      padding: "21px",
      borderRadius: "12px",
      border: "1px solid #e7eaf0",
      marginBottom: "16px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "11px",
        marginBottom: "17px"
      }}>
        <div style={{
          width: "37px",
          height: "37px",
          borderRadius: "9px",
          background: "#edf3ff",
          color: "#315fc5",
          display: "grid",
          placeItems: "center"
        }}>
          <Icon size={19} />
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: "17px" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{
              margin: "4px 0 0",
              color: "#8290a5",
              fontSize: "12px"
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {safeItems.length === 0 ? (
        <p style={{
          color: "#8290a5",
          fontSize: "13px",
          margin: 0
        }}>
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function Priority({ value }) {
  const priority = (value || "Medium").toLowerCase();

  const colors = {
    high: { background: "#fff0ee", color: "#c24135" },
    medium: { background: "#fff7e8", color: "#a66a12" },
    low: { background: "#edf7f0", color: "#267447" }
  };

  const style = colors[priority] || colors.medium;

  return (
    <span style={{
      ...style,
      padding: "5px 9px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }}>
      {value || "Medium"} priority
    </span>
  );
}

function SourceQuality({ source }) {
  const quality = source.source_quality || "Unassessed";

  const colors = {
    "User-generated": {
      background: "#fff0ee",
      color: "#c24135"
    },
    "Research / institutional": {
      background: "#e9f8ef",
      color: "#217346"
    },
    "Established organization": {
      background: "#e9f8ef",
      color: "#217346"
    },
    "Unassessed": {
      background: "#fff7e8",
      color: "#a66a12"
    },
    "Unclassified": {
      background: "#f0f1f4",
      color: "#667085"
    }
  };

  const style = colors[quality] || colors.Unassessed;

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px"
      }}>
        <span style={{
          background: style.background,
          color: style.color,
          padding: "5px 9px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700
        }}>
          {quality}
        </span>

        {source.analysis_priority != null && (
          <span style={{
            color: "#8290a5",
            fontSize: "11px"
          }}>
            Analysis priority: {source.analysis_priority}
          </span>
        )}
      </div>

      {source.quality_reason && (
        <p style={{
          color: "#8290a5",
          fontSize: "12px",
          margin: "7px 0 0",
          lineHeight: 1.5
        }}>
          Source assessment: {source.quality_reason}
        </p>
      )}
    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [researchResults, setResearchResults] = useState(null);
  const [researchError, setResearchError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkBackend() {
      try {
        const response = await fetch(
          `${API_URL}/api/connection-test`
        );

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const data = await response.json();

        if (active) {
          setBackendStatus(data.connected ? "online" : "offline");
        }
      } catch {
        if (active) {
          setBackendStatus("offline");
        }
      }
    }

    checkBackend();

    return () => {
      active = false;
    };
  }, []);

  async function startResearch() {
    const researchQuestion = question.trim();

    if (researchQuestion.length < 5) {
      setResearchError(
        "Please enter a research question with at least 5 characters."
      );
      return;
    }

    if (backendStatus !== "online") {
      setResearchError(
        "Research backend is unavailable. Please try again shortly."
      );
      return;
    }

    setLoading(true);
    setResearchError("");
    setResearchResults(null);

    try {
      const response = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: researchQuestion,
          sources: []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Research request failed."
        );
      }

      setResearchResults(data);
    } catch (error) {
      setResearchError(
        error.message || "Unable to complete the research request."
      );
    } finally {
      setLoading(false);
    }
  }

  function startNewInvestigation() {
    setQuestion("");
    setResearchResults(null);
    setResearchError("");
    setMenuOpen(false);
  }

  const analysis = researchResults?.analysis;
  const sources = researchResults?.sources || [];

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menuOpen ? "sidebar-open" : "")}>
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={21} />
          </div>
          <div>
            <h2>DarkSpot</h2>
            <span>RESEARCH INTELLIGENCE</span>
          </div>
        </div>

        <button className="new-research" onClick={startNewInvestigation}>
          <span><Search size={18} /></span>
          New investigation
        </button>

        <p className="nav-label">WORKSPACE</p>

        <nav>
          <a className="nav-item active" href="#overview">
            <LayoutDashboard size={18} /> Overview
          </a>
          <a className="nav-item" href="#history">
            <History size={18} /> History
          </a>
          <a className="nav-item" href="#saved">
            <Bookmark size={18} /> Saved research
          </a>
        </nav>

        <p className="nav-label tools-label">TOOLS</p>

        <nav>
          <a className="nav-item" href="#settings">
            <Settings size={18} /> Settings
          </a>
          <a className="nav-item" href="#help">
            <HelpCircle size={18} /> Help center
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className={
            "status-dot " +
            (backendStatus === "online" ? "connected" : "")
          }></div>
          <span>Research engine setup</span>
          <span className="setup-badge">
            {backendStatus === "online"
              ? "CONNECTED"
              : backendStatus === "checking"
                ? "CHECKING"
                : "OFFLINE"}
          </span>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> Overview
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <span className={
                "status-dot " +
                (backendStatus === "online" ? "connected" : "")
              }></span>
              {backendStatus === "online"
                ? "Backend connected"
                : backendStatus === "checking"
                  ? "Checking backend"
                  : "Backend offline"}
            </span>
            <div className="avatar">DS</div>
          </div>
        </header>

        <section className="welcome-section">
          <div className="eyebrow">
            <Sparkles size={14} /> INTELLIGENCE STARTS HERE
          </div>

          <h1>
            Find what's <span>missing.</span>
          </h1>

          <p className="welcome-description">
            Explore information gaps, uncover conflicting claims, and
            discover what the sources aren't telling you.
          </p>
        </section>

        <section className="research-card">
          <div className="card-heading">
            <div>
              <h2>Start an investigation</h2>
              <p>What do you want to know?</p>
            </div>
            <span className="ai-label">
              <Sparkles size={14} /> WEB + AI ANALYSIS
            </span>
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Example: Compare the environmental impact of electric vehicles and petrol cars. What information is missing from current research?"
            maxLength={1000}
          />

          <div className="input-footer">
            <span>{question.length} / 1000 characters</span>
            <span>Be specific for better results</span>
          </div>

          <div style={{
            marginTop: "18px",
            padding: "12px 14px",
            background: "#f5f8ff",
            border: "1px solid #e4ebfa",
            borderRadius: "8px",
            color: "#526078",
            fontSize: "12px",
            lineHeight: 1.6
          }}>
            <ShieldCheck size={14} style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: "6px"
            }} />
            DarkSpot discovers web sources automatically. Direct URL
            submission is not available in this prototype yet.
          </div>

          <button
            className="research-button"
            onClick={startResearch}
            disabled={loading}
          >
            <Search size={18} />
            {loading ? "Researching and analyzing..." : "Prepare investigation"}
            {!loading && <ArrowUpRight size={17} />}
          </button>

          <p className="privacy-note">
            <ShieldCheck size={14} />
            Retrieved sources are displayed with links for review.
          </p>

          {researchError && (
            <div style={{
              marginTop: "16px",
              padding: "12px 15px",
              background: "#fff0f0",
              color: "#b42318",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              {researchError}
            </div>
          )}
        </section>

        {loading && (
          <section style={{
            marginTop: "25px",
            padding: "20px",
            background: "#ffffff",
            borderRadius: "12px"
          }}>
            <strong>Researching your question...</strong>
            <p style={{ color: "#667085", fontSize: "14px" }}>
              Collecting web sources and preparing AI-assisted evidence analysis.
              The first request may take longer if the backend is waking up.
            </p>
          </section>
        )}

        {researchResults && (
          <section style={{ marginTop: "30px" }}>
            <div className="section-heading">
              <h2>Research results</h2>
              <span>{sources.length} SOURCES FOUND</span>
            </div>

            <div style={{
              background: "#ffffff",
              padding: "18px",
              borderRadius: "12px",
              marginBottom: "20px"
            }}>
              <strong>Research question</strong>
              <p style={{ marginBottom: 0, color: "#667085" }}>
                {researchResults.question}
              </p>
            </div>

            {researchResults.analysis_status === "success" && analysis ? (
              <div style={{ marginBottom: "28px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "17px",
                  flexWrap: "wrap"
                }}>
                  <Brain size={22} color="#315fc5" />
                  <h2 style={{ margin: 0, fontSize: "21px" }}>
                    DarkSpot intelligence analysis
                  </h2>
                  <span style={{
                    background: "#e9f8ef",
                    color: "#217346",
                    padding: "5px 9px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700
                  }}>
                    AI ANALYZED
                  </span>
                </div>

                <AnalysisSection
                  title="Key claims"
                  subtitle="Claims identified in the retrieved sources"
                  icon={Lightbulb}
                  items={analysis.key_claims}
                  emptyMessage="No supported claims were identified."
                >
                  {(analysis.key_claims || []).map((item, index) => (
                    <div key={index} style={{
                      padding: "14px 0",
                      borderBottom: index !== analysis.key_claims.length - 1
                        ? "1px solid #edf0f5" : "none"
                    }}>
                      <strong style={{ fontSize: "14px", lineHeight: 1.6 }}>
                        {item.claim}
                      </strong>
                      <p style={{
                        color: "#667085",
                        fontSize: "13px",
                        lineHeight: 1.6,
                        margin: "7px 0 0"
                      }}>
                        {item.support}
                      </p>
                      <SourceReferences ids={item.source_ids} sources={sources} />
                    </div>
                  ))}
                </AnalysisSection>

                <AnalysisSection
                  title="Agreements across sources"
                  subtitle="Findings supported by multiple sources"
                  icon={CheckCircle2}
                  items={analysis.agreements}
                  emptyMessage="No cross-source agreements were identified."
                >
                  {(analysis.agreements || []).map((item, index) => (
                    <div key={index} style={{
                      padding: "13px 0",
                      borderBottom: index !== analysis.agreements.length - 1
                        ? "1px solid #edf0f5" : "none"
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: "14px",
                        lineHeight: 1.7
                      }}>
                        {item.finding}
                      </p>
                      <SourceReferences ids={item.source_ids} sources={sources} />
                    </div>
                  ))}
                </AnalysisSection>

                <AnalysisSection
                  title="Potential conflicts"
                  subtitle="Differences that require further investigation"
                  icon={AlertTriangle}
                  items={analysis.potential_conflicts}
                  emptyMessage="No potential conflicts were identified in the retrieved source content."
                >
                  {(analysis.potential_conflicts || []).map((item, index) => (
                    <div key={index} style={{
                      padding: "14px 0",
                      borderBottom: index !== analysis.potential_conflicts.length - 1
                        ? "1px solid #edf0f5" : "none"
                    }}>
                      <strong style={{ fontSize: "14px" }}>
                        {item.issue}
                      </strong>
                      <p style={{
                        color: "#526078",
                        fontSize: "13px",
                        lineHeight: 1.7
                      }}>
                        {item.explanation}
                      </p>
                      <div style={{
                        background: "#fff8ed",
                        padding: "11px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        lineHeight: 1.6
                      }}>
                        <strong>What needs verification?</strong>
                        <p style={{ margin: "5px 0 0" }}>
                          {item.verification_needed}
                        </p>
                      </div>
                      <SourceReferences ids={item.source_ids} sources={sources} />
                    </div>
                  ))}
                </AnalysisSection>

                <AnalysisSection
                  title="Evidence gaps"
                  subtitle="Information missing from the retrieved evidence"
                  icon={FileSearch}
                  items={analysis.evidence_gaps}
                  emptyMessage="No specific evidence gaps were identified."
                >
                  {(analysis.evidence_gaps || []).map((item, index) => (
                    <div key={index} style={{
                      padding: "13px 0",
                      borderBottom: index !== analysis.evidence_gaps.length - 1
                        ? "1px solid #edf0f5" : "none"
                    }}>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "8px"
                      }}>
                        <strong style={{ fontSize: "14px" }}>
                          {item.gap}
                        </strong>
                        <Priority value={item.importance} />
                      </div>
                      <p style={{
                        color: "#667085",
                        fontSize: "13px",
                        lineHeight: 1.6,
                        marginBottom: 0
                      }}>
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </AnalysisSection>

                <AnalysisSection
                  title="Unanswered questions"
                  subtitle="Questions that need further research"
                  icon={MessageCircleQuestion}
                  items={analysis.unanswered_questions}
                  emptyMessage="No additional questions were generated."
                >
                  <ul style={{
                    paddingLeft: "20px",
                    margin: 0,
                    color: "#526078",
                    fontSize: "14px",
                    lineHeight: 1.9
                  }}>
                    {(analysis.unanswered_questions || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </AnalysisSection>

                <AnalysisSection
                  title="Verification checklist"
                  subtitle="Suggested next steps to verify the findings"
                  icon={ListChecks}
                  items={analysis.verification_checklist}
                  emptyMessage="No verification tasks were generated."
                >
                  {(analysis.verification_checklist || []).map((item, index) => (
                    <div key={index} style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px 0",
                      borderBottom: index !== analysis.verification_checklist.length - 1
                        ? "1px solid #edf0f5" : "none"
                    }}>
                      <div style={{
                        display: "flex",
                        gap: "10px",
                        fontSize: "14px",
                        lineHeight: 1.6
                      }}>
                        <span style={{ color: "#315fc5", fontWeight: 700 }}>
                          {index + 1}.
                        </span>
                        {item.task}
                      </div>
                      <Priority value={item.priority} />
                    </div>
                  ))}
                </AnalysisSection>

                <AnalysisSection
                  title="Analysis limitations"
                  subtitle="Important boundaries of this analysis"
                  icon={ShieldCheck}
                  items={analysis.limitations}
                  emptyMessage="No limitations were returned."
                >
                  <ul style={{
                    paddingLeft: "20px",
                    margin: 0,
                    color: "#667085",
                    fontSize: "13px",
                    lineHeight: 1.8
                  }}>
                    {(analysis.limitations || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </AnalysisSection>
              </div>
            ) : (
              <div style={{
                background: "#fff8ed",
                padding: "16px",
                borderRadius: "10px",
                marginBottom: "20px",
                color: "#80551a",
                fontSize: "13px"
              }}>
                <strong>AI analysis unavailable</strong>
                <p style={{ marginBottom: 0 }}>
                  {researchResults.analysis_message ||
                    "The search results are available, but AI analysis was not returned. You can retry the investigation."}
                </p>
              </div>
            )}

            <div className="section-heading">
              <h2>Retrieved sources</h2>
              <span>{sources.length} SOURCES</span>
            </div>

            {sources.length === 0 ? (
              <p>No search results were found. Try a different question.</p>
            ) : (
              <div style={{ display: "grid", gap: "15px" }}>
                {sources.map((source, index) => (
                  <article
                    key={source.id || source.url || index}
                    style={{
                      background: "#ffffff",
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid #e7eaf0"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginBottom: "14px"
                    }}>
                      <span style={{
                        color: "#667085",
                        fontSize: "12px",
                        fontWeight: 600
                      }}>
                        {source.id || `SOURCE ${index + 1}`}
                      </span>

                      <span style={{
                        color: "#667085",
                        fontSize: "12px"
                      }}>
                        Search relevance: {
                          typeof source.score === "number"
                            ? Math.round(source.score * 100) + "%"
                            : "Not available"
                        }
                      </span>
                    </div>

                    <SourceQuality source={source} />

                    <h3 style={{
                      margin: "0 0 10px",
                      fontSize: "17px"
                    }}>
                      {source.title || "Untitled source"}
                    </h3>

                    <p style={{
                      color: "#526078",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      margin: "0 0 14px"
                    }}>
                      {source.content || "No preview available."}
                    </p>

                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          fontSize: "13px",
                          fontWeight: 600,
                          overflowWrap: "anywhere"
                        }}
                      >
                        Open original source <ArrowUpRight size={13} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}

            <p style={{
              color: "#667085",
              fontSize: "12px",
              lineHeight: 1.7,
              marginTop: "18px"
            }}>
              <ShieldCheck size={14} style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "5px"
              }} />
              AI-generated analysis is based on retrieved source content.
              It is not independent verification or a guarantee of factual
              accuracy. Source classifications are preliminary domain-based
              assessments, not verified credibility ratings. Search relevance
              is not a credibility score. Review original sources before
              relying on any finding.
            </p>
          </section>
        )}

        <section className="examples-section">
          <div className="section-heading">
            <h2>Need inspiration?</h2>
            <span>TRY AN EXAMPLE</span>
          </div>

          <div className="example-grid">
            {[
              {
                icon: "🌍",
                title: "Climate research",
                description: "Identify gaps in global climate change reports.",
                prompt: "Analyze global climate change research. Identify missing evidence, conflicting claims, and outdated information."
              },
              {
                icon: "🤖",
                title: "AI & technology",
                description: "Explore unanswered questions about AI safety.",
                prompt: "Analyze current research on AI safety. Identify unanswered questions, conflicting claims, and missing evidence."
              },
              {
                icon: "🏥",
                title: "Public health",
                description: "Find gaps in public health information.",
                prompt: "Analyze public health research on air pollution. Identify missing evidence, conflicting findings, and outdated information."
              }
            ].map((example) => (
              <button
                className="example-card"
                key={example.title}
                onClick={() => {
                  setQuestion(example.prompt);
                  setResearchResults(null);
                  setResearchError("");
                }}
              >
                <span className="example-icon">{example.icon}</span>
                <strong>{example.title}</strong>
                <span className="example-description">
                  {example.description}
                </span>
                <span className="example-action">
                  Use example <ArrowUpRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="page-footer">
          <span>Digital Dark Spot</span>
          <span>Research intelligence workspace · Prototype</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
