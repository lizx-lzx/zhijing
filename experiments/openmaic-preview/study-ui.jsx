import React, { useEffect, useRef } from "react";

// Native dialogs provide focus trapping, Escape dismissal and focus restoration.
export function StudyDialog({ title, className = "", onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`study-dialog ${className}`}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" onClick={onClose} autoFocus aria-label="关闭弹窗">
          关闭 ×
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}

// The same semantic nodes power the landscape slide and the reflowed diagram.
// Parallel paths stay separate; a cycle explicitly closes, instead of becoming
// an ordinary causal chain just because the screen is narrow.
export function ResponsiveDiagram({ diagram, title }) {
  const { layout, groups } = diagram;
  const linked = ["flow", "cycle", "ladder", "timeline"].includes(layout);
  return (
    <section
      className={`responsive-diagram relation-${layout}`}
      aria-label={`${title}纵向图解`}
    >
      <h2>{title}</h2>
      <p className="diagram-subtitle">{diagram.subtitle}</p>
      <div className="diagram-groups">
        {groups.map((nodes, group) => (
          <div className="diagram-path" key={group}>
            {nodes.map((node, index) => (
              <React.Fragment key={`${group}-${index}`}>
                {index > 0 && (linked || layout === "contrast") && (
                  <div
                    className="relation-marker"
                    aria-label={
                      layout === "contrast" ? "不等同于" : "沿此路径继续"
                    }
                  >
                    {layout === "contrast" ? "≠" : "↓"}
                  </div>
                )}
                <div className="diagram-node">
                  <h3>{node.title}</h3>
                  <p>{node.detail}</p>
                </div>
              </React.Fragment>
            ))}
            {layout === "cycle" && (
              <p className="cycle-return">↩ 反馈回到起点：{nodes[0].title}</p>
            )}
          </div>
        ))}
      </div>
      {layout === "timeline" && (
        <p className="diagram-warning">作者设想，不是现实进度条</p>
      )}
      <p className="diagram-note">{diagram.note}</p>
    </section>
  );
}
