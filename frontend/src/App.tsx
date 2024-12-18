import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter as Router, Route,  Routes, Link } from 'react-router-dom';
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import Collections from './components/Collections';
import MintedUsers from './components/MintedUsers';
import Home from './components/Home';
import Boosters from './components/Boosters';
import './css/App.css';

//Gestion de Metamask et du contrat
type Canceler = () => void
const useAffect = (
  asyncEffect: () => Promise<Canceler | void>,
  dependencies: any[] = []
) => {
  const cancelerRef = useRef<Canceler | void>()
  useEffect(() => {
    asyncEffect()
      .then(canceler => (cancelerRef.current = canceler))
      .catch(error => console.warn('Uncatched error', error))
    return () => {
      if (cancelerRef.current) {
        cancelerRef.current()
        cancelerRef.current = undefined
      }
    }
  }, dependencies)
}

const useWallet = () => {
  const [details, setDetails] = useState<ethereum.Details>()
  const [contract, setContract] = useState<main.Main>()
  useAffect(async () => {
    const details_ = await ethereum.connect('metamask')
    if (!details_) return
    setDetails(details_)
    const contract_ = await main.init(details_)
    if (!contract_) return
    setContract(contract_)
  }, [])
  return useMemo(() => {
    if (!details || !contract) return
    return { details, contract }
  }, [details, contract])
}

//Sidebar

const Sidebar = () => (
  <div className='sidebar'>
    <h2>Menu</h2>
    <ul>
      <li><Link to="/">Accueil</Link></li>
      <li><Link to="/collections">Collections</Link></li>
      <li><Link to="/minted-users">Utilisateurs</Link></li>
      <li><Link to="/boosters">Boosters</Link></li>
    </ul>
  </div>
);

export const App = () => {
  const wallet = useWallet()
  return (
    <Router>
      <div className='app-container'>
        <Sidebar />
        <div className='main-container'> 
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/minted-users" element={<MintedUsers />} />
            <Route path="/boosters" element={<Boosters />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App;