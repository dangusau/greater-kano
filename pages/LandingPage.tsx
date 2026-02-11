import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheckIcon,  BriefcaseIcon,  UsersIcon, 
  LinkIcon, 
  ShoppingCartIcon, 
  BuildingLibraryIcon, 
  CalendarDaysIcon,ArrowDownTrayIcon } from "@heroicons/react/24/solid";
  import {
  EnvelopeIcon,
  PhoneIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      <HeroSection />
      <WhyGKBC />
      <PioneersSection />
      <FeaturesSection />
      <CallToAction />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* IMAGE FIRST — top on mobile, left on desktop */}
        <div className="flex justify-center md:justify-start">
          <div className="bg-white rounded-xl p-4 w-48 sm:w-56 md:w-64">
            <img
              src="/gkbclogo.png"
              alt="GKBC Logo"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* TEXT COLUMN */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Greater Kano Business Council
          </h1>

          <p className="mt-6 text-lg font-bold ">
            Africa&apos;s Emerging Economic Vanguard.
          </p>

          <p className="mt-4 text-lg text-blue-10">
            Greater Kano connects entrepreneurs, professionals, and
            organizations into one trusted business ecosystem.
          </p>

          <div className="mt-8 flex gap-4 flex-wrap">
            {/* Join → signup */}
            <Link to="/signup">
              <button className="bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-100 transition">
                Join GKBC
              </button>
            </Link>

            {/* Sign In → login */}
            <Link to="/login">
              <button className="border border-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-white/500 transition">
                Sign In
              </button>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ---------------- WHY ---------------- */

function WhyGKBC() {
  const features = [
    {
      title: "Visibility & Credibility",
      description:
        "GKBC positions you where serious business conversations, partnerships, and growth happen.",
      icon: <ShieldCheckIcon className="h-8 w-8 text-blue-600" />,
    },
    {
      title: "Trusted Business Network",
      description:
        "Connect with verified entrepreneurs, professionals, and organizations to grow your network.",
      icon: <UsersIcon className="h-8 w-8 text-blue-600" />,
    },
    {
      title: "Real Opportunities",
      description:
        "Access jobs, marketplaces, and announcements to discover tangible business opportunities.",
      icon: <BriefcaseIcon className="h-8 w-8 text-blue-600" />,
    },
  ];

  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-blue-700">
          Why Join GKBC?
        </h2>

        <p className="mt-6 text-lg text-slate-600">
          Business grows faster when the right people are connected
          in the right environment.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="h-16 w-16 mb-4 flex items-center justify-center bg-blue-100 rounded-lg mx-auto">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="mt-2 text-slate-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



/* ---------------- PIONEERS ---------------- */

const pioneers = [
  { image: "/pioneers/pioneer2.jpg" },
  { image: "/pioneers/pioneer1.jpg" },
  { image: "/pioneers/pioneer3.jpg" },
  { image: "/pioneers/pioneer4.jpg" },
  { image: "/pioneers/pioneer5.jpg" },
  { image: "/pioneers/pioneer6.jpg" },
  { image: "/pioneers/pioneer7.jpg" },
  { image: "/pioneers/pioneer8.jpg" },
];

function PioneersSection() {
  return (
    <section className="bg-blue-700 py-10 overflow-hidden">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto px-6 text-center mb-10">
        <h2 className="text-4xl font-bold text-white">
          GKBC Pioneers
        </h2>
        <p className="mt-6 text-lg md:text-xl text-blue-100 max-w-3xl mx-auto">
          Visionaries who laid the foundation of the Greater Kano Business Council.
        </p>
      </div>

      {/* SLIDER */}
      <div className="overflow-hidden">
        <div className="flex pioneers-track whitespace-nowrap gap-6">
          {[...pioneers, ...pioneers].map((pioneer, index) => (
            <div
              key={index}
              className="flex-none w-[200px] sm:w-[220px] bg-white rounded-xl p-4 shadow-md"
            >
              <div className="h-48 w-full rounded-lg overflow-hidden">
                <img
                  src={pioneer.image}
                  className="h-full w-full object-cover"
                  alt="GKBC Pioneer"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */

function FeaturesSection() {
  const features = [
    {
      title: "Business Social Network",
      desc: "Share insights, updates, and ideas in a focused business environment.",
      icon: <UsersIcon className="h-10 w-10 text-blue-600" />,
    },
    {
      title: "Professional Connectivity",
      desc: "Connect directly with entrepreneurs, professionals, and decision-makers.",
      icon: <LinkIcon className="h-10 w-10 text-blue-600" />,
    },
    {
      title: "Marketplace",
      desc: "Buy, sell, and offer services within a trusted local business ecosystem.",
      icon: <ShoppingCartIcon className="h-10 w-10 text-blue-600" />,
    },
    {
      title: "Business Directory",
      desc: "Get your business listed in the verified GKBC business directory.",
      icon: <BuildingLibraryIcon className="h-10 w-10 text-blue-600" />,
    },
    {
      title: "Jobs & Opportunities",
      desc: "Post and discover jobs, gigs, and professional opportunities.",
      icon: <BriefcaseIcon className="h-10 w-10 text-blue-600" />,
    },
    {
      title: "Events",
      desc: "Find seminars, workshops, and programs to boost your knowledge.",
      icon: <CalendarDaysIcon className="h-10 w-10 text-blue-600" />,
    },
  ];

  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-blue-700">
          What You Can Do on GKBC
        </h2>

        <div className="mt-14 grid md:grid-cols-3 gap-10">
          {features.map((f) => (
            <div key={f.title} className="border rounded-xl p-6 hover:shadow-lg transition">
              <div className="h-16 w-16 bg-blue-100 rounded-lg mb-4 flex items-center justify-center mx-auto">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mt-2">{f.title}</h3>
              <p className="mt-2 text-slate-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */

function CallToAction() {
  return (
    <footer className="bg-blue-700 text-white py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">

        {/* MAIN CTA */}
        <h2 className="text-3xl font-bold">
          Join the Future of Business in Greater Kano
        </h2>


       <Link to="/signup">
  <button className="mt-8 bg-white text-blue-700 px-8 py-4 rounded-lg font-semibold shadow-lg hover:bg-blue-50 transition">
    Join GKBC Now
  </button>
</Link>

        {/* CONTACT US */}
        <div className="mt-14">
          <h3 className="text-xl font-semibold mb-4">Contact Us</h3>

          <div className="flex flex-wrap justify-center gap-8 text-blue-100">
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-6 w-6 text-white" />
              <span>08023104333</span>
            </div>

            <div className="flex items-center gap-2">
              <EnvelopeIcon className="h-6 w-6 text-white" />
              <span>gkbc.1000@hotmail.com</span>
            </div>
          </div>
        </div>

        {/* APP AVAILABILITY */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-4">Available On</h3>

          <div className="flex flex-wrap justify-center gap-8 text-blue-100">
            <div className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="h-6 w-6 text-white" />
              <span>Google Play Store</span>
            </div>

            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-6 w-6 text-white" />
              <span>Apple App Store</span>
            </div>
          </div>
        </div>

        {/* EST */}
        <div className="mt-10 text-blue-200">
          Est. 2025
        </div>
      </div>

      {/* FOOT NOTE */}
      <div className="mt-16 text-center text-[11px] text-blue-400">
        Sizes©
      </div>
    </footer>
  );
}

