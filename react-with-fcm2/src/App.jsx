import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MessageForm from './MessageForm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <div>
      <MessageForm />
     </div>
    </>
  )
}

export default App
