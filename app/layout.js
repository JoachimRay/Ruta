import 'leaflet/dist/leaflet.css';


export const metadata = { 
  title: "RUTA Cebu",
  description: "Jeepney route helper app for Cebu city",
};


export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
