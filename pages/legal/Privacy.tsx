import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>

      <p className="text-sm text-gray-600 mb-4">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p>
          GKBC respects your privacy. This policy explains how we collect, use,
          and protect your information.
        </p>

        <h2 className="font-semibold">1. Information We Collect</h2>
        <p>
          We collect information you provide during registration, including name,
          email, phone number, and business details.
        </p>

        <h2 className="font-semibold">2. How We Use Information</h2>
        <p>
          Your data is used to provide services, verify accounts, approve listings,
          and improve the platform.
        </p>

        <h2 className="font-semibold">3. Data Sharing</h2>
        <p>
          We do not sell your data. Information may be shared only when required
          by law or for platform security.
        </p>

        <h2 className="font-semibold">4. Security</h2>
        <p>
          We take reasonable steps to protect your information but cannot guarantee
          absolute security.
        </p>

        <h2 className="font-semibold">5. Your Rights</h2>
        <p>
          You may request access, correction, or deletion of your data through
          Help & Support.
        </p>

        <h2 className="font-semibold">6. Updates</h2>
        <p>
          This policy may be updated. Continued use indicates acceptance.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
