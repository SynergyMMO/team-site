import { useEffect, useRef } from 'react'

// Calls handler when Enter is pressed anywhere on the page (e.g. focus on the body
// or a dialog) unless the key was already handled by the focused control.
// Inside a textarea only Ctrl/Cmd+Enter submits. `ignoreRef` skips events from an element that handles Enter itself.
export default function useEnterToSubmit(handler, { enabled = true, ignoreRef } = {}) {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })

  useEffect(() => {
    if (!enabled) return undefined
    function onKeyDown(e) {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (ignoreRef?.current?.contains(target)) return
      if (tag === 'textarea') {
        if (!(e.ctrlKey || e.metaKey)) return
      } else if (tag === 'button' || tag === 'a' || tag === 'select') {
        return
      }
      e.preventDefault()
      handlerRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, ignoreRef])
}
