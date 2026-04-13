import type { ReactNode } from "react";

export type ToolResultKind =
  | "screen"
  | "poverty"
  | "rec"
  | "calc"
  | "match"
  | "push"
  | "windows"
  | "hidden"
  | "precheck"
  | "dashboard";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function asStringArray(x: unknown): string[] | null {
  if (!Array.isArray(x)) return null;
  if (x.every((i) => typeof i === "string")) return x as string[];
  return null;
}

function asObjArray(x: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(x)) return null;
  if (x.every((i) => isRecord(i))) return x as Record<string, unknown>[];
  return null;
}

/** 与 asObjArray 类似，但跳过非对象项，避免单行脏数据导致整表无法展示 */
function asObjArrayLenient(x: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(x)) return null;
  const rows = x.filter((i): i is Record<string, unknown> => isRecord(i));
  return rows.length ? rows : null;
}

function NoteBanner({ text }: { text: string }) {
  return (
    <p className="tool-visual-note" role="status">
      {text}
    </p>
  );
}

function Disclaimer({ text }: { text: string }) {
  return <p className="tool-visual-disclaimer">{text}</p>;
}

function FallbackObject({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k]) => k !== "note" && k !== "disclaimer");
  return (
    <div className="tool-visual-fallback">
      <p className="tool-visual-fallback-title">结果摘要</p>
      <ul className="tool-visual-kv-list">
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="tool-visual-k">{k}</span>
            <span className="tool-visual-v">
              {v === null || v === undefined
                ? "—"
                : typeof v === "object"
                  ? "（结构化数据，略）"
                  : String(v)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderScreen(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const anomalies = asObjArray(data.anomalies);
  const exList = asObjArray(data.exception_list);

  return (
    <>
      {note && <NoteBanner text={note} />}
      {typeof data.total === "number" && (
        <p className="tool-visual-summary">
          共筛查 <strong>{data.total}</strong> 人
          {typeof data.blocked_count === "number" && (
            <>
              ，建议拦截级 <strong>{data.blocked_count}</strong> 人
            </>
          )}
          {typeof data.warn_count === "number" && (
            <>
              ，提示级 <strong>{data.warn_count}</strong> 人
            </>
          )}
          。
        </p>
      )}
      {anomalies && anomalies.length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">筛查明细</h4>
          <div className="table-wrap tool-visual-table-wrap">
            <table className="data-table tool-visual-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>级别</th>
                  <th>规则代码</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((row, i) => (
                  <tr key={`${String(row.student_id)}-${i}`}>
                    <td>{String(row.student_id ?? "—")}</td>
                    <td>
                      {row.severity === "block"
                        ? "建议拦截"
                        : row.severity === "warn"
                          ? "提示"
                          : String(row.severity ?? "—")}
                    </td>
                    <td>{Array.isArray(row.codes) ? (row.codes as string[]).join(", ") : "—"}</td>
                    <td>
                      {Array.isArray(row.messages)
                        ? (row.messages as string[]).join(" ")
                        : typeof row.reason === "string"
                          ? row.reason
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!anomalies && exList && exList.length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">异常名单（演示）</h4>
          <ul className="tool-visual-bullet">
            {exList.map((row, i) => (
              <li key={i}>
                <strong>{String(row.student_id ?? "—")}</strong>
                {typeof row.reason === "string" ? `：${row.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
    </>
  );
}

function renderPoverty(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  if ("hidden_poverty_score" in data) {
    const level = String(data.level ?? "");
    const levelZh =
      level === "high" ? "较高" : level === "medium" ? "中等" : level === "low" ? "较低" : level;
    return (
      <>
        {note && <NoteBanner text={note} />}
        <div className="tool-visual-section">
          <p className="tool-visual-lead">
            学号 <code className="inline-code">{String(data.student_id ?? "—")}</code>
          </p>
          <p className="tool-visual-summary">
            隐形贫困启发式评分：<strong>{String(data.hidden_poverty_score)}</strong>（0～1），风险等级：
            <strong>{levelZh}</strong>
          </p>
          {asStringArray(data.reasons) && (
            <ul className="tool-visual-bullet">
              {(data.reasons as string[]).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
        {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
      </>
    );
  }
  return (
    <>
      {note && <NoteBanner text={note} />}
      <div className="tool-visual-section">
        <p className="tool-visual-summary">
          学号 <strong>{String(data.student_id ?? "—")}</strong>
          ，演示风险等级：<strong>{String(data.risk_level ?? "—")}</strong>
          ，评分 <strong>{String(data.score ?? "—")}</strong>
        </p>
        {typeof data.recommendation === "string" && <p>{data.recommendation}</p>}
      </div>
    </>
  );
}

function renderRec(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const recs = data.recommendations;
  const strArr = asStringArray(recs);
  const objArr = asObjArray(recs);
  return (
    <>
      {note && <NoteBanner text={note} />}
      {strArr && (
        <ul className="tool-visual-bullet">
          {strArr.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
      {objArr && (
        <ul className="tool-visual-card-list">
          {objArr.map((row, i) => (
            <li key={i} className="tool-visual-card">
              <div className="tool-visual-card-title">{String(row.policy ?? "政策")}</div>
              <div className="tool-visual-card-meta">{String(row.type ?? "")}</div>
              {typeof row.note === "string" && <p className="tool-visual-card-body">{row.note}</p>}
            </li>
          ))}
        </ul>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
    </>
  );
}

function renderCalc(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  if ("theoretical_max_total_yuan" in data) {
    const items = asObjArray(data.items);
    return (
      <>
        {note && <NoteBanner text={note} />}
        <div className="tool-visual-section">
          <p className="tool-visual-summary">
            理论可申请合计（演示择高/互斥后）：<strong>{String(data.theoretical_max_total_yuan)}</strong> 元/学年
          </p>
          {data.can_apply_grant_and_encouragement_together === true && (
            <p className="tool-visual-hint">国家励志奖学金与国家助学金通常可同时申请（以当年学校通知为准）。</p>
          )}
          {items && items.length > 0 && (
            <div className="table-wrap tool-visual-table-wrap">
              <table className="data-table tool-visual-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>是否满足演示门槛</th>
                    <th>估算金额（元）</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => (
                    <tr key={i}>
                      <td>{String(row.policy ?? "—")}</td>
                      <td>{row.eligible === true ? "是" : row.eligible === false ? "否" : "—"}</td>
                      <td>{String(row.amount_yuan ?? "—")}</td>
                      <td>{String(row.reason ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {asStringArray(data.warnings)?.map((w, i) => (
            <p key={`w-${i}`} className="tool-visual-warn">
              {w}
            </p>
          ))}
          {asStringArray(data.notes)?.map((n, i) => (
            <p key={`n-${i}`} className="tool-visual-hint">
              {n}
            </p>
          ))}
        </div>
        {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
      </>
    );
  }
  const detail = isRecord(data.detail) ? data.detail : null;
  return (
    <>
      {note && <NoteBanner text={note} />}
      <p className="tool-visual-summary">
        演示估算合计：<strong>{String(data.estimated_total_yuan ?? "—")}</strong> 元/学年
      </p>
      {detail && (
        <ul className="tool-visual-bullet">
          {Object.entries(detail).map(([k, v]) => (
            <li key={k}>
              {k}：<strong>{String(v)}</strong> 元
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function renderMatch(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const matchedStr = asStringArray(data.matched);
  if (matchedStr) {
    return (
      <>
        {note && <NoteBanner text={note} />}
        <ul className="tool-visual-bullet">
          {matchedStr.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </>
    );
  }
  const matches = asObjArray(data.matches);
  const notMatched = asObjArray(data.not_matched);
  return (
    <>
      {note && <NoteBanner text={note} />}
      {typeof data.block_reason === "string" && (
        <p className="tool-visual-warn" role="alert">
          {data.block_reason}
        </p>
      )}
      {isRecord(data.summary) && (
        <p className="tool-visual-summary">
          匹配命中：国家类 <strong>{String((data.summary as Record<string, unknown>).national_count ?? 0)}</strong>，
          校内类 <strong>{String((data.summary as Record<string, unknown>).school_count ?? 0)}</strong>，
          社会类 <strong>{String((data.summary as Record<string, unknown>).social_count ?? 0)}</strong>
        </p>
      )}
      {matches && matches.length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">可能适合申请的奖项（演示）</h4>
          <ul className="tool-visual-card-list">
            {matches.map((row, i) => (
              <li key={i} className="tool-visual-card tool-visual-card-ok">
                <div className="tool-visual-card-title">{String(row.name ?? "—")}</div>
                <div className="tool-visual-card-meta">
                  {String(row.category ?? "")} · 匹配度 {String(row.fit_score ?? "—")}
                </div>
                <p className="tool-visual-card-body">{String(row.reason ?? "")}</p>
                {typeof row.note === "string" && row.note && (
                  <p className="tool-visual-card-note">{row.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notMatched && notMatched.length > 0 && (
        <details className="tool-visual-details">
          <summary>未满足的候选奖项（{notMatched.length} 项，可展开查看原因）</summary>
          <ul className="tool-visual-bullet tool-visual-muted">
            {notMatched.slice(0, 12).map((row, i) => (
              <li key={i}>
                <strong>{String(row.name ?? "—")}</strong>：{String(row.reason ?? "")}
              </li>
            ))}
            {notMatched.length > 12 && <li>… 另有 {notMatched.length - 12} 项略</li>}
          </ul>
        </details>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
    </>
  );
}

function renderPush(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const strRem = asStringArray(data.reminders);
  if (strRem) {
    return (
      <>
        {note && <NoteBanner text={note} />}
        <p className="tool-visual-summary">参考月份：{String(data.month ?? "—")}</p>
        <ul className="tool-visual-bullet">
          {strRem.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </>
    );
  }
  const reminders = asObjArray(data.reminders);
  return (
    <>
      {note && <NoteBanner text={note} />}
      {typeof data.reference_month === "number" && (
        <p className="tool-visual-summary">
          参考月份：<strong>{data.reference_month}</strong> 月，当前匹配到的奖项数：{" "}
          <strong>{String(data.matched_awards_count ?? "—")}</strong>
        </p>
      )}
      {reminders && reminders.length > 0 && (
        <ul className="tool-visual-card-list">
          {reminders.map((row, i) => (
            <li key={i} className="tool-visual-card">
              <div className="tool-visual-card-title">{String(row.title ?? "—")}</div>
              <div className="tool-visual-card-meta">
                {row.in_alert_window === true ? (
                  <span className="tool-visual-tag tool-visual-tag-active">当前在常见提醒窗口内</span>
                ) : (
                  <span className="tool-visual-tag">可提前准备</span>
                )}
              </div>
              <p className="tool-visual-card-body">{String(row.typical_period ?? row.typical_period_text ?? "")}</p>
              {typeof row.push_hint === "string" && (
                <p className="tool-visual-card-note">{row.push_hint}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
    </>
  );
}

function renderWindows(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const wins = asObjArray(data.windows);
  if (!wins) return <FallbackObject data={data} />;
  const isReal = wins[0] && "window_id" in wins[0];
  return (
    <>
      {note && <NoteBanner text={note} />}
      <ul className="tool-visual-card-list">
        {wins.map((row, i) => (
          <li key={i} className="tool-visual-card">
            {isReal ? (
              <>
                <div className="tool-visual-card-title">{String(row.title ?? "—")}</div>
                <div className="tool-visual-card-meta">{String(row.category ?? "")}</div>
                <p className="tool-visual-card-body">
                  {String(row.typical_period_text ?? row.typical_period ?? "")}
                </p>
                {Array.isArray(row.alert_months) && (
                  <p className="tool-visual-card-note">
                    建议关注月份：{(row.alert_months as number[]).join("、")} 月
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="tool-visual-card-title">
                  {String(row.month ?? "—")} 月（演示）
                </div>
                {asStringArray(row.topics) && (
                  <ul className="tool-visual-bullet">
                    {(row.topics as string[]).map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function renderHidden(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const flagged = asObjArray(data.flagged_students);
  const staticRows = asObjArray(data.rows);
  return (
    <>
      {note && <NoteBanner text={note} />}
      {typeof data.hit_count === "number" && (
        <p className="tool-visual-summary">演示命中：<strong>{data.hit_count}</strong> 条</p>
      )}
      {flagged && flagged.length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">需重点复核的学生（演示）</h4>
          <ul className="tool-visual-card-list">
            {flagged.map((row, i) => (
              <li key={i} className="tool-visual-card">
                <div className="tool-visual-card-title">
                  {String(row.student_id ?? "—")} · {String(row.grade ?? "")} {String(row.major ?? "")}
                </div>
                <p className="tool-visual-card-meta">风险分 {String(row.risk_score ?? "—")}</p>
                {asStringArray(row.reasons)?.map((r, j) => (
                  <p key={j} className="tool-visual-card-body">
                    {r}
                  </p>
                ))}
                {typeof row.anonymous_message === "string" && (
                  <p className="tool-visual-card-note">{row.anonymous_message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {staticRows && staticRows.length > 0 && !flagged?.length && (
        <ul className="tool-visual-bullet">
          {staticRows.map((row, i) => (
            <li key={i}>
              <strong>{String(row.student_id)}</strong>：{String(row.risk_level ?? "")}{" "}
              {asStringArray(row.reasons)?.join("；")}
            </li>
          ))}
        </ul>
      )}
      {asObjArray(data.anonymous_warnings) && (data.anonymous_warnings as Record<string, unknown>[]).length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">匿名汇总提示</h4>
          <ul className="tool-visual-bullet">
            {(data.anonymous_warnings as Record<string, unknown>[]).map((row, i) => (
              <li key={i}>{String(row.message ?? `${row.grade} ${row.major}：${row.suspected_count} 人`)}</li>
            ))}
          </ul>
        </div>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
    </>
  );
}

function renderPrecheck(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const eligible = asObjArray(data.eligible);
  const abnormal = asObjArray(data.abnormal);
  if (!eligible && !abnormal && typeof data.eligible_count === "number") {
    return (
      <>
        {note && <NoteBanner text={note} />}
        <p className="tool-visual-summary">
          演示统计：符合条件约 <strong>{data.eligible_count}</strong> 人，异常约{" "}
          <strong>{String(data.exception_count ?? "—")}</strong> 人。
        </p>
      </>
    );
  }
  return (
    <>
      {note && <NoteBanner text={note} />}
      <p className="tool-visual-summary">
        符合条件：
        <strong>
          {eligible?.length ??
            (typeof data.eligible_count === "number" ? data.eligible_count : 0)}
        </strong>{" "}
        人；异常待处理：
        <strong>
          {abnormal?.length ?? (typeof data.abnormal_count === "number" ? data.abnormal_count : 0)}
        </strong>{" "}
        人。
      </p>
      {abnormal && abnormal.length > 0 && (
        <div className="tool-visual-section">
          <h4 className="tool-visual-h4">异常情况清单</h4>
          <div className="table-wrap tool-visual-table-wrap">
            <table className="data-table tool-visual-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>学院</th>
                  <th>级别</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {abnormal.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row.student_id ?? "—")}</td>
                    <td>{String(row.name ?? "—")}</td>
                    <td>{String(row.college ?? "—")}</td>
                    <td>{row.severity === "block" ? "拦截" : row.severity === "warn" ? "提示" : String(row.severity ?? "—")}</td>
                    <td>{String(row.messages ?? row.codes ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {eligible && eligible.length > 0 && (
        <details className="tool-visual-details">
          <summary>符合条件学生名单（{eligible.length} 人）</summary>
          <div className="table-wrap tool-visual-table-wrap">
            <table className="data-table tool-visual-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>学院</th>
                  <th>专业</th>
                  <th>申请意向</th>
                </tr>
              </thead>
              <tbody>
                {eligible.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td>{String(row.student_id ?? "—")}</td>
                    <td>{String(row.name ?? "—")}</td>
                    <td>{String(row.college ?? "—")}</td>
                    <td>{String(row.major ?? "—")}</td>
                    <td>{String(row.intent ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {eligible.length > 50 && <p className="tool-visual-hint">仅展示前 50 行，完整数据请导出 Excel。</p>}
        </details>
      )}
    </>
  );
}

function renderDashboard(data: Record<string, unknown>): ReactNode {
  const note = typeof data.note === "string" ? data.note : null;
  const progress = asObjArrayLenient(data.apply_progress);
  const colleges = asObjArrayLenient(data.college_completion_rate);
  const appeals = asObjArrayLenient(data.pending_appeals);
  if (!progress && typeof data.applications_total === "number") {
    const cc = asObjArrayLenient(data.colleges_completion);
    return (
      <div className="tool-visual-dashboard">
        {note && <NoteBanner text={note} />}
        <p className="tool-visual-summary dashboard-lead">
          演示：累计申请 <strong>{String(data.applications_total)}</strong>，已审核{" "}
          <strong>{String(data.reviewed)}</strong>，待处理 <strong>{String(data.pending)}</strong>。
        </p>
        {cc && (
          <div className="dashboard-section">
            <h4 className="dashboard-section-title">学院完成率（演示）</h4>
            <ul className="dashboard-completion-list">
              {cc.map((row, i) => {
                const pct = Math.round(Number(row.rate) * 100);
                return (
                  <li key={i} className="dashboard-completion-item">
                    <div className="dashboard-completion-head">
                      <span className="dashboard-completion-name">{String(row.college)}</span>
                      <span className="dashboard-completion-pct">{pct}%</span>
                    </div>
                    <div className="dashboard-completion-track" aria-hidden>
                      <div className="dashboard-completion-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="tool-visual-dashboard">
      {note && <NoteBanner text={note} />}
      {progress && progress.length > 0 && (
        <div className="dashboard-section">
          <h4 className="dashboard-section-title">申请进度（示例）</h4>
          <div className="table-wrap dashboard-table-wrap tool-visual-table-wrap">
            <table className="data-table tool-visual-table dashboard-table">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>已提交</th>
                  <th>已通过</th>
                  <th>未通过</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((row, i) => (
                  <tr key={i}>
                    <td>{String(row.category ?? "—")}</td>
                    <td>{String(row.submitted ?? "—")}</td>
                    <td>{String(row.approved ?? "—")}</td>
                    <td>{String(row.rejected ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {colleges && colleges.length > 0 && (
        <div className="dashboard-section">
          <h4 className="dashboard-section-title">学院材料完成率（示例）</h4>
          <ul className="dashboard-completion-list">
            {colleges.map((row, i) => {
              const pct = Math.round(Number(row.completion_rate) * 100);
              return (
                <li key={i} className="dashboard-completion-item">
                  <div className="dashboard-completion-head">
                    <span className="dashboard-completion-name">{String(row.college ?? "—")}</span>
                    <span className="dashboard-completion-pct">{pct}%</span>
                  </div>
                  <div className="dashboard-completion-track" aria-hidden>
                    <div className="dashboard-completion-fill" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {appeals && appeals.length > 0 && (
        <div className="dashboard-section">
          <h4 className="dashboard-section-title">待处理异议 / 工单（示例）</h4>
          <ul className="dashboard-ticket-list">
            {appeals.map((row, i) => (
              <li key={i} className="dashboard-ticket-card">
                <div className="dashboard-ticket-id">{String(row.ticket_id ?? "—")}</div>
                <div className="dashboard-ticket-meta">
                  {String(row.college ?? "")} · 已等待 {String(row.days_pending ?? "—")} 天
                </div>
                <p className="dashboard-ticket-status">{String(row.status ?? "")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {typeof data.disclaimer === "string" && <Disclaimer text={data.disclaimer} />}
      {!(
        (progress && progress.length > 0) ||
        (colleges && colleges.length > 0) ||
        (appeals && appeals.length > 0)
      ) && (
        <>
          <p className="tool-visual-hint">
            未解析到看板表格数据（apply_progress / college_completion_rate / pending_appeals）。以下为接口返回字段摘要：
          </p>
          <FallbackObject data={data} />
        </>
      )}
    </div>
  );
}

export function ToolResultVisual({ kind, data }: { kind: ToolResultKind; data: unknown }) {
  if (data === null || data === undefined) return null;
  if (typeof data === "string") {
    const text = data.length > 800 ? `${data.slice(0, 800)}…` : data;
    return (
      <div className="tool-visual-root">
        <div className="error-banner tool-visual-error" role="alert">
          {text}
        </div>
      </div>
    );
  }
  if (!isRecord(data)) {
    return (
      <div className="tool-visual-root">
        <p className="tool-visual-error">无法展示该结果。</p>
      </div>
    );
  }

  let body: ReactNode;
  switch (kind) {
    case "screen":
      body = renderScreen(data);
      break;
    case "poverty":
      body = renderPoverty(data);
      break;
    case "rec":
      body = renderRec(data);
      break;
    case "calc":
      body = renderCalc(data);
      break;
    case "match":
      body = renderMatch(data);
      break;
    case "push":
      body = renderPush(data);
      break;
    case "windows":
      body = renderWindows(data);
      break;
    case "hidden":
      body = renderHidden(data);
      break;
    case "precheck":
      body = renderPrecheck(data);
      break;
    case "dashboard":
      body = renderDashboard(data);
      break;
    default:
      body = <FallbackObject data={data} />;
  }

  const rootClass =
    kind === "dashboard" ? "tool-visual-root tool-visual-dashboard-shell" : "tool-visual-root";
  return <div className={rootClass}>{body}</div>;
}
