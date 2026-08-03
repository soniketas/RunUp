import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import HomeView from './components/HomeView'
import ZoneView from './components/ZoneView'
import PickingView from './components/PickingView'
import SettingsView from './components/SettingsView'
import { useStock } from './hooks/useStock'

function App() {
  const [view, setView] = useState('home')
  const {
    zones,
    itemsByZone,
    increment,
    decrement,
    setFull,
    setEmpty,
    reset,
    pickingByZone,
    toggleChecked,
    setPickQuantity,
    finalizeChecked,
    pendingCount,
    summary,
    stockBreakdown,
    missingByZone,
    runnerName,
    setRunnerName,
    lastUpdated,
    shortages,
    dismissShortage,
    addZone,
    updateZone,
    removeZone,
    addProduct,
    updateProduct,
    removeProduct,
  } = useStock()

  return (
    <div className="flex h-dvh flex-col bg-page text-ink">
      {(view === 'zones' || view === 'picking') && (
        <Header
          title={view === 'zones' ? 'Bar Stock' : 'Lista de Carga'}
          subtitle={view === 'zones' ? `${zones.length} zonas · Turno de hoy` : 'Depósito'}
          pendingCount={pendingCount}
          summary={summary}
          tone={view === 'zones' ? 'yellow' : 'green'}
        />
      )}

      {view === 'home' && (
        <HomeView
          summary={summary}
          stockBreakdown={stockBreakdown}
          missingByZone={missingByZone}
          runnerName={runnerName}
          setRunnerName={setRunnerName}
          lastUpdated={lastUpdated}
          pendingCount={pendingCount}
          shortages={shortages}
          dismissShortage={dismissShortage}
          onNavigate={setView}
        />
      )}

      {view === 'zones' && (
        <ZoneView
          zones={zones}
          itemsByZone={itemsByZone}
          increment={increment}
          decrement={decrement}
          setFull={setFull}
          setEmpty={setEmpty}
        />
      )}

      {view === 'picking' && (
        <PickingView
          pickingByZone={pickingByZone}
          toggleChecked={toggleChecked}
          setPickQuantity={setPickQuantity}
          onFinalize={finalizeChecked}
        />
      )}

      {view === 'settings' && (
        <SettingsView
          zones={zones}
          itemsByZone={itemsByZone}
          addZone={addZone}
          updateZone={updateZone}
          removeZone={removeZone}
          addProduct={addProduct}
          updateProduct={updateProduct}
          removeProduct={removeProduct}
        />
      )}

      <BottomNav view={view} onChange={setView} pendingCount={pendingCount} onReset={reset} />
    </div>
  )
}

export default App
