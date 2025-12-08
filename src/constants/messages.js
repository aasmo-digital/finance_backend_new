module.exports = {
    // Auth
    REGISTER_SUCCESS: "Registration successful.",
    LOGIN_SUCCESS: "Login successful.",
    INVALID_CREDENTIALS: "Invalid credentials.",
    ALL_FIELDS_REQUIRED: "Please provide all required fields.",
    USER_EXISTS: "User with this email already exists.",
    ADMIN_EXISTS: "Admin with this email already exists.",
    AGENT_EXISTS: "Agent with this email already exists.",
    ACCESS_DENIED_NO_TOKEN: "Access denied. No token provided.",
    ACCESS_DENIED_FORBIDDEN: "Access denied. You do not have permission to perform this action.",
    INVALID_TOKEN: "Invalid token.",
    USER_NOT_FOUND_TOKEN: "User ID not found in token.",

    // Generic
    FETCH_SUCCESS: "Fetched successfully.",
    NOT_FOUND: "Resource not found.",
    SERVER_ERROR: "Server error occurred. Please try again later.",
    CREATED_SUCCESS: "Created successfully.",
    UPDATED_SUCCESS: "Updated successfully.",
    DELETED_SUCCESS: "Deleted successfully.",
    INVALID_ID: "Invalid ID provided.",
    STATUS_INVALID: "Invalid status provided.",
    IMAGE_UPLOAD_REQUIRED: "All required images must be uploaded.",
    ONLY_IMAGE_ALLOWED: "Only image files are allowed",
    AMOUNT_MUST_BE_POSITIVE: "Amount must be a positive number.",
    DATE_REQUIRED: "Date is required.",

    // User Specific
    USER_CREATED_BY_ADMIN: "User created successfully by Admin.",
    USER_CREATED_BY_AGENT: "User created successfully by Agent.",
    USER_NOT_FOUND: "User not found.",

    // Agent Specific
    AGENT_REGISTER_SUCCESS: "Agent registered successfully.",
    AGENT_NOT_FOUND: "Agent not found.",
    AGENT_LIMIT_REACHED: "Agent has reached the maximum user registration limit for their package.",
    AGENT_INVALID_PACKAGE: "Agent's package is invalid or not found.",

    // Package Specific
    PACKAGE_CREATED: "Package created successfully.",
    PACKAGE_NOT_FOUND: "Package not found.",
    PACKAGE_UPDATE_SUCCESS: "Package updated successfully.",
    PACKAGE_DELETE_SUCCESS: "Package deleted successfully.",
    PACKAGE_TYPE_INVALID: "Invalid package type. Must be 'loan' or 'agent'.",

    // KYC Specific
    KYC_CREATED_SUCCESS: "KYC created successfully.",
    KYC_NOT_FOUND: "KYC record not found.",
    KYC_UPDATED_SUCCESS: "KYC status updated successfully.",
    KYC_DELETED_SUCCESS: "KYC record deleted successfully.",
    KYC_ALREADY_SUBMITTED: "KYC already submitted for this user.",
    KYC_STATUS_INVALID: "Invalid KYC status. Only 'Approved' or 'Rejected' are allowed.",

    // Loan Specific
    LOAN_APPLIED_SUCCESS: "Loan application submitted successfully.",
    LOAN_NOT_FOUND: "Loan record not found.",
    LOAN_UPDATED_SUCCESS: "Loan status updated successfully.",
    LOAN_DELETED_SUCCESS: "Loan record deleted successfully.",
    LOAN_STATUS_INVALID: "Invalid loan status. Only 'Approved' or 'Rejected' are allowed.",
    LOAN_ALREADY_APPROVED: "This loan has already been approved.",
    LOAN_ALREADY_REJECTED: "This loan has already been rejected.",
    LOAN_ELIGIBILITY_CHECK: "Loan eligibility requires active KYC and previous loan repayment.",
    LOAN_AMOUNT_INVALID: "Requested loan amount is outside eligible range.",

    // Installment Specific
    INSTALLMENT_NOT_FOUND: "Installment not found.",
    INSTALLMENT_STATUS_UPDATED: "Installment status updated successfully.",
    INSTALLMENT_ALREADY_PAID: "Installment is already marked as paid.",
    INSTALLMENT_PENDING_PAYMENT: "Installment payment is pending.",

    // Payment Specific
    PAYMENT_UPLOADED_SUCCESS: "Payment receipt uploaded successfully. Waiting for admin approval.",
    PAYMENT_NOT_FOUND: "Payment record not found.",
    PAYMENT_STATUS_UPDATED: "Payment status updated successfully.",

    // Commission Specific
    COMMISSION_CREATED: "Commission record created successfully.",
    COMMISSION_NOT_FOUND: "Commission record not found.",
    COMMISSION_UPDATED: "Commission record updated successfully.",
    COMMISSION_DELETED: "Commission record deleted successfully.",
    COMMISSION_ALREADY_SET: "Commission already set for this agent.",

    // Balance Sheet
    BALANCE_SHEET_FETCHED: "Balance sheet fetched successfully."
};