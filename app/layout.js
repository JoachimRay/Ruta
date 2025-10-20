import 'leaflet/dist/leaflet.css';


export const metadata = { 
  title: "RUTA Cebu",
  description: "Jeepney route helper app for Cebu city",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
  themeColor: "#4CAF50",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RUTA Cebu"
  }
};



// Compatibility phone 
export default function RootLayout({ children }) {
  return (
    <html lang="en">  
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
