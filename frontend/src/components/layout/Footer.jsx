const Footer = () => {
    return (
      <footer className="bg-darkBg text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Micro-Adventure. All rights reserved.</p>
        </div>
      </footer>
    );
  };
  
  export default Footer;