import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Adventure from './pages/Adventure';
import Summary from './pages/Summary';
import { AdventureProvider } from './context/AdventureContext';

function App() {
  return (
    <AdventureProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/adventure" element={<Adventure />} />
              <Route path="/summary" element={<Summary />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AdventureProvider>
  );
}

export default App;