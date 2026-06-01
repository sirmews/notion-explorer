import React from 'react'

export const TitleBar: React.FC = () => {
  return (
    <div className="titlebar">
      <div className="traffic-lights">
        <div className="traffic-light close"></div>
        <div className="traffic-light minimize"></div>
        <div className="traffic-light maximize"></div>
      </div>
      <div className="titlebar-title">Notion Explorer</div>
      <div className="titlebar-spacer"></div>
    </div>
  )
}

export default TitleBar
