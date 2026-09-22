import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function GenerationDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    element.querySelector<HTMLTextAreaElement>('textarea:not(:disabled)')?.focus({ preventScroll: true });
    // The dialog owns only the form surface, never the generation request.
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="modal generation-modal" aria-labelledby="generation-dialog-title" aria-describedby="generation-dialog-description" onCancel={(e) => { e.preventDefault(); onClose(); }} onKeyDown={(e) => {
    if (e.key !== 'Tab') return;
    const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], summary, [tabindex]')].filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first && last) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last && first) { e.preventDefault(); first.focus(); }
  }}>
    <div className="generation-dialog-heading"><div><p className="eyebrow">NEW ALGORITHM</p><h2 id="generation-dialog-title">生成新题演示</h2><p id="generation-dialog-description">在这里填写题目、核对约定。提交成功后，回到主界面等待和播放演示。</p></div><button className="icon-button" aria-label="关闭新题窗口" onClick={onClose}><X size={19} /></button></div>
    <div className="generation-dialog-body">{children}</div>
    <div className="generation-dialog-footer"><p>关闭窗口会保留本页填写内容，不会取消任务；刷新页面不保留未保存内容。</p><button className="secondary-button" onClick={onClose}>返回主界面</button></div>
  </dialog>;
}
