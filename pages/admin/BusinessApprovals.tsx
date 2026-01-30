import React from 'react';

const BusinessApprovals: React.FC = () => {
  const pendingBusinesses = [
    { id: 1, name: 'Kano Electronics', owner: 'Aliyu Dangusau', category: 'Electronics' },
    { id: 2, name: 'Beirut Bakery', owner: 'Fatima Musa', category: 'Food' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Pending Business Approvals</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Business Name</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingBusinesses.map((biz) => (
              <tr key={biz.id} className="border-b">
                <td className="p-3">{biz.name}</td>
                <td className="p-3">{biz.owner}</td>
                <td className="p-3">{biz.category}</td>
                <td className="p-3 space-x-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                    Approve
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BusinessApprovals;
