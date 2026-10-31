interface Props {
  text: string | null
  leaving: boolean
}

/** 环境提示，不拦截操作：只在底部漂一行字。 */
export function Onboarding({ text, leaving }: Props) {
  if (!text) return null
  return (
    <div className="onboard-hint" data-out={leaving}>
      {text}
    </div>
  )
}
