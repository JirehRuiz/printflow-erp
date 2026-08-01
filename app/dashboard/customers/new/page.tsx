import CustomerForm from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">New Customer</h1>
      <p className="mt-1 text-sm text-gray-500">Add someone directly, without going through a lead.</p>

      <div className="mt-6">
        <CustomerForm />
      </div>
    </div>
  );
}
