const sharp = require('sharp');
const path = require('path');

async function main() {
  const docSvg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="white"/>
      <rect x="20" y="20" width="760" height="560" fill="none" stroke="#1e3a8a" stroke-width="4"/>
      <text x="400" y="80" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#1e3a8a">GOVERNMENT OF KARNATAKA</text>
      <text x="400" y="120" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#1e3a8a">DEPARTMENT OF REVENUE</text>
      <text x="400" y="170" font-family="Arial, sans-serif" font-size="26" font-weight="bold" text-anchor="middle" fill="#b91c1c">INCOME CERTIFICATE</text>
      <text x="80" y="240" font-family="Arial, sans-serif" font-size="18" fill="black">Certificate No: RD0088776655</text>
      <text x="80" y="290" font-family="Arial, sans-serif" font-size="18" fill="black">Applicant Name: Sukrutha K</text>
      <text x="80" y="340" font-family="Arial, sans-serif" font-size="18" fill="black">Father Name: Kumar K</text>
      <text x="80" y="390" font-family="Arial, sans-serif" font-size="18" fill="black">Annual Family Income: Rs. 180000</text>
      <text x="80" y="440" font-family="Arial, sans-serif" font-size="18" fill="black">Valid For: 5 Years</text>
      <text x="600" y="510" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="black">Tahsildar</text>
      <text x="600" y="540" font-family="Arial, sans-serif" font-size="16" fill="#4b5563">Bengaluru South</text>
    </svg>
  `;

  const randomSvg = `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="400" fill="#0284c7"/>
      <circle cx="300" cy="200" r="100" fill="#f59e0b"/>
      <text x="300" y="350" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">Sunset Photography</text>
    </svg>
  `;

  await sharp(Buffer.from(docSvg)).png().toFile('test_income_cert.png');
  await sharp(Buffer.from(randomSvg)).jpeg().toFile('test_random_image.jpg');
  console.log('Successfully generated test_income_cert.png and test_random_image.jpg');
}

main().catch(console.error);
