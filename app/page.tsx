import { Suspense } from 'react';
import FeaturedNews from '@/components/FeaturedNews';
import VendorSection from '@/components/VendorSection';
import { Newspaper, Building2, Building, BookOpen, LineChart, BarChart, TrendingUp, ArrowLeftRight } from 'lucide-react';

// Export vendors so it can be imported in other files
export const vendors = [
  {
    id: 'df.cl',
    name: 'DF.cl',
    logo: <Newspaper className="h-8 w-8 text-blue-600" />,
    news: [
      {
        id: '1',
        title: 'Chilean Economy Shows Signs of Recovery',
        description: 'Latest economic indicators suggest a positive trend in Chile\'s economic growth...',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
        category: 'Economy',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '2',
        title: 'Santiago Stock Exchange Reaches New Heights',
        description: 'Local market shows strong performance amid global economic stability...',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '3',
        title: 'Tech Investment in Chile Surges',
        description: 'Foreign investment in Chilean technology sector reaches record levels...',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '4',
        title: 'Mining Sector Updates',
        description: 'Latest developments in Chile\'s mining industry and commodity markets...',
        image: 'https://images.unsplash.com/photo-1605792657660-596af9009e82',
        category: 'Commodities',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '5',
        title: 'Retail Sector Growth Accelerates',
        description: 'Chilean retail sector shows strong recovery with increased consumer spending...',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        category: 'Retail',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '6',
        title: 'Infrastructure Investment Plans',
        description: 'Government announces major infrastructure development projects...',
        image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625',
        category: 'Infrastructure',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '7',
        title: 'Green Energy Initiatives',
        description: 'Chile leads Latin America in renewable energy adoption...',
        image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7',
        category: 'Energy',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '8',
        title: 'Startup Ecosystem Expansion',
        description: 'Chilean startup scene attracts international attention and investment...',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '4 min read',
      }
    ]
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    logo: <Newspaper className="h-8 w-8 text-orange-600" />,
    news: [
      {
        id: '1',
        title: 'Global Markets Rally on Tech Earnings',
        description: 'Technology sector leads global market gains as major companies report strong earnings...',
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '2',
        title: 'Cryptocurrency Market Analysis',
        description: 'Digital assets show resilience as institutional adoption increases...',
        image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
        category: 'Crypto',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '3',
        title: 'Fed Policy Impact on Markets',
        description: 'Markets react to Federal Reserve\'s latest monetary policy decisions...',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
        category: 'Economy',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '4',
        title: 'ESG Investment Trends',
        description: 'Sustainable investing continues to gain momentum globally...',
        image: 'https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8',
        category: 'Investment',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '5',
        title: 'AI Revolution in Finance',
        description: 'Artificial Intelligence reshapes financial services industry...',
        image: 'https://images.unsplash.com/photo-1488229297570-58520851e868',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '6',
        title: 'Global Supply Chain Updates',
        description: 'Supply chain resilience improves amid technological adoption...',
        image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3',
        category: 'Logistics',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '7',
        title: 'Emerging Markets Outlook',
        description: 'Analysis of investment opportunities in developing economies...',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '8',
        title: 'Healthcare Sector Innovation',
        description: 'Healthcare industry transformation driven by technology...',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
        category: 'Healthcare',
        date: 'April 10, 2024',
        readTime: '6 min read',
      }
    ]
  },
  {
    id: 'wsj',
    name: 'Wall Street Journal',
    logo: <Newspaper className="h-8 w-8 text-primary" />,
    news: [
      {
        id: '1',
        title: 'Global Markets Rally on Strong Economic Data',
        description: 'Markets across Asia and Europe surge as economic indicators show robust growth and recovery.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '2',
        title: 'Tech Giants Face New Regulatory Challenges',
        description: 'Major technology companies navigate complex regulatory landscape amid global scrutiny.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '3',
        title: 'Federal Reserve Signals Policy Shift',
        description: 'Central bank officials hint at potential changes in monetary policy approach.',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
        category: 'Economy',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '4',
        title: 'Energy Sector Transformation',
        description: 'Renewable energy adoption speeds up as traditional energy companies pivot.',
        image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7',
        category: 'Energy',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '5',
        title: 'Supply Chain Innovation',
        description: 'Companies leverage technology to overcome logistics challenges.',
        image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3',
        category: 'Business',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '6',
        title: 'Real Estate Market Trends',
        description: 'Analysis of commercial and residential real estate markets.',
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
        category: 'Real Estate',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '7',
        title: 'Global Trade Relations',
        description: 'Updates on international trade agreements and negotiations.',
        image: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a',
        category: 'Trade',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '8',
        title: 'Cybersecurity Investments',
        description: 'Companies increase spending on digital security measures.',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '4 min read',
      }
    ]
  },
  {
    id: 'ft',
    name: 'Financial Times',
    logo: <BookOpen className="h-8 w-8 text-pink-600" />,
    news: [
      {
        id: '1',
        title: 'European Markets Face New Challenges',
        description: 'Financial markets in Europe grapple with economic uncertainties.',
        image: 'https://images.unsplash.com/photo-1491336477066-31156b5e4f35',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '2',
        title: 'Brexit Impact Analysis',
        description: 'Long-term effects of Brexit on European financial services.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
        category: 'Brexit',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '3',
        title: 'Asian Markets Growth',
        description: 'Economic indicators point to sustained growth in Asian markets.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
        category: 'Markets',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '4',
        title: 'Investment Trends 2024',
        description: 'Analysis of emerging investment patterns worldwide.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
        category: 'Investment',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '5',
        title: 'Climate Finance Initiatives',
        description: 'Financial sector responds to climate change challenges.',
        image: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1',
        category: 'Climate',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '6',
        title: 'Digital Banking Evolution',
        description: 'Traditional banks adapt to fintech competition.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
        category: 'Banking',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '7',
        title: 'Corporate Governance Trends',
        description: 'New standards reshape corporate leadership practices.',
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
        category: 'Governance',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '8',
        title: 'Quantum Computing Impact',
        description: 'Financial industry prepares for quantum computing era.',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '6 min read',
      }
    ]
  },
  {
    id: 'cmf',
    name: 'CMF',
    logo: <Building2 className="h-8 w-8 text-green-600" />,
    news: [
      {
        id: '1',
        title: 'New Financial Regulations',
        description: 'Updated regulatory framework for financial institutions.',
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85',
        category: 'Regulation',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '2',
        title: 'Market Supervision Updates',
        description: 'New guidelines for market supervision requirements.',
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
        category: 'Supervision',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '3',
        title: 'Investor Protection Measures',
        description: 'Enhanced measures to protect retail investors.',
        image: 'https://images.unsplash.com/photo-1618044733300-9472054094ee',
        category: 'Protection',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '4',
        title: 'Fintech Standards',
        description: 'New standards for fintech companies in Chile.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
        category: 'Technology',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '5',
        title: 'Digital Banking Guidelines',
        description: 'Regulatory framework for digital banking services.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
        category: 'Banking',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '6',
        title: 'Cybersecurity Requirements',
        description: 'Updated security standards for financial institutions.',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
        category: 'Security',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '7',
        title: 'Consumer Protection Updates',
        description: 'New measures for financial consumer protection.',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
        category: 'Protection',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '8',
        title: 'Insurance Sector Regulation',
        description: 'Regulatory changes in insurance industry.',
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85',
        category: 'Insurance',
        date: 'April 10, 2024',
        readTime: '6 min read',
      }
    ]
  },
  {
    id: 'markets',
    name: 'Markets',
    logo: <LineChart className="h-8 w-8 text-violet-600" />,
    news: [
      {
        id: '1',
        title: 'Government Bond Market Analysis',
        description: 'Comprehensive overview of sovereign bond yields and market trends.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Bonds',
        date: 'April 10, 2024',
        readTime: '5 min read',
        icon: <BarChart className="h-6 w-6" />
      },
      {
        id: '2',
        title: 'Corporate Bond Market Update',
        description: 'Analysis of corporate bond spreads and investment opportunities.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Bonds',
        date: 'April 10, 2024',
        readTime: '4 min read',
        icon: <BarChart className="h-6 w-6" />
      },
      {
        id: '3',
        title: 'Precious Metals Market Trends',
        description: 'Gold, silver, and platinum market analysis and price forecasts.',
        image: 'https://images.unsplash.com/photo-1605792657660-596af9009e82',
        category: 'Commodities',
        date: 'April 10, 2024',
        readTime: '6 min read',
        icon: <TrendingUp className="h-6 w-6" />
      },
      {
        id: '4',
        title: 'Energy Commodities Overview',
        description: 'Oil, natural gas, and renewable energy market developments.',
        image: 'https://images.unsplash.com/photo-1605792657660-596af9009e82',
        category: 'Commodities',
        date: 'April 10, 2024',
        readTime: '5 min read',
        icon: <TrendingUp className="h-6 w-6" />
      },
      {
        id: '5',
        title: 'Global Stock Market Review',
        description: 'Analysis of major stock indices and market performance.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Stocks',
        date: 'April 10, 2024',
        readTime: '4 min read',
        icon: <LineChart className="h-6 w-6" />
      },
      {
        id: '6',
        title: 'Equity Sector Performance',
        description: 'Detailed analysis of stock market sectors and trends.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Stocks',
        date: 'April 10, 2024',
        readTime: '6 min read',
        icon: <LineChart className="h-6 w-6" />
      },
      {
        id: '7',
        title: 'Interest Rate Swap Markets',
        description: 'Overview of interest rate swap trends and pricing.',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
        category: 'Swaps',
        date: 'April 10, 2024',
        readTime: '5 min read',
        icon: <ArrowLeftRight className="h-6 w-6" />
      },
      {
        id: '8',
        title: 'Currency Swap Analysis',
        description: 'Cross-currency swap market developments and opportunities.',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
        category: 'Swaps',
        date: 'April 10, 2024',
        readTime: '4 min read',
        icon: <ArrowLeftRight className="h-6 w-6" />
      }
    ]
  },
  {
    id: 'banco-central',
    name: 'Banco Central',
    logo: <Building className="h-8 w-8 text-blue-600" />,
    news: [
      {
        id: '1',
        title: 'Monetary Policy Update',
        description: 'Key decisions on interest rates and monetary policy.',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
        category: 'Policy',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '2',
        title: 'Economic Projections',
        description: 'Updated forecasts for Chilean economic growth.',
        image: 'https://images.unsplash.com/photo-1543286386-713bdd548da4',
        category: 'Economy',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '3',
        title: 'Financial Stability Report',
        description: 'Assessment of Chilean financial system stability.',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
        category: 'Finance',
        date: 'April 10, 2024',
        readTime: '7 min read',
      },
      {
        id: '4',
        title: 'International Reserves',
        description: 'Status of Chile\'s international reserves.',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
        category: 'Reserves',
        date: 'April 10, 2024',
        readTime: '4 min read',
      },
      {
        id: '5',
        title: 'Digital Currency Research',
        description: 'Central bank digital currency development plans.',
        image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
        category: 'Digital',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '6',
        title: 'Payment Systems Update',
        description: 'Modernization of national payment infrastructure.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
        category: 'Payments',
        date: 'April 10, 2024',
        readTime: '5 min read',
      },
      {
        id: '7',
        title: 'Banking Sector Analysis',
        description: 'Comprehensive review of Chilean banking system.',
        image: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f',
        category: 'Banking',
        date: 'April 10, 2024',
        readTime: '6 min read',
      },
      {
        id: '8',
        title: 'Inflation Outlook Report',
        description: 'Analysis of inflation trends and projections.',
        image: 'https://images.unsplash.com/photo-1543286386-713bdd548da4',
        category: 'Economy',
        date: 'April 10, 2024',
        readTime: '5 min read',
      }
    ]
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <FeaturedNews />
      <div className="container py-8 space-y-16">
        {vendors.map((vendor) => (
          <Suspense key={vendor.id} fallback={<div>Loading...</div>}>
            <VendorSection vendor={vendor} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}