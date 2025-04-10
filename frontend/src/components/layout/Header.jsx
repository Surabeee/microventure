import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Micro-Adventure</Link>
        <nav>
          <Link to="/" className="hover:text-gray-200">Home</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;