import React, { useState, useEffect, useRef } from "react";

const SideBar = ({ children, minWidth = 150, maxWidth = 400, defaultWidth = 250 }) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  
  // Load saved width from localStorage if available
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      setWidth(Number(savedWidth));
    }
  }, []);
  
  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarWidth', width);
  }, [width]);

  // Handle mouse down on the resize handle
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move while resizing
  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    let newWidth = e.clientX;
    
    // Enforce min and max width constraints
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    
    setWidth(newWidth);
  };

  // Handle mouse up to stop resizing
  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        style={{
          width: `${width}px`,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "#1a1a1a",
          borderRight: "1px solid #333",
          color: "#f7931a",
          overflowY: "auto",
          transition: isResizing ? "none" : "width 0.2s ease",
          zIndex: 1000,
          padding: "16px",
          boxSizing: "border-box",
          paddingTop: "64px", // Adjust to match header height exactly
        }}
      >
        {children}
      </div>
      
      {/* Resize handle */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: `${width}px`,
          width: "8px",
          height: "100vh",
          cursor: "ew-resize",
          zIndex: 1001,
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "3px",
            width: "2px",
            height: "100%",
            backgroundColor: isResizing ? "#f7931a" : "transparent",
            transition: "background-color 0.2s ease",
          }}
        />
      </div>

      {/* Main content spacer to offset for sidebar */}
      <div style={{ marginLeft: `${width}px`, height: 0 }} />
    </>
  );
};

export default SideBar; 