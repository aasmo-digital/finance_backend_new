const calculateLoanEligibility = (lastLoanAmount) => {
    const baseLoan = 2000;
    let eligibleMin, eligibleMax;

    if (lastLoanAmount === 0) { // First time loan
        eligibleMin = baseLoan;
        eligibleMax = baseLoan;
    } else {
        eligibleMin = lastLoanAmount;
        eligibleMax = lastLoanAmount + baseLoan; // Next loan is previous + 2000
    }

    // You might want to cap the max loan amount eventually
    if (eligibleMax > 50000) { // Example cap
        eligibleMax = 50000;
    }

    return { min: eligibleMin, max: eligibleMax };
};

const calculateInstallmentDuration = (loanAmount) => {
    if (loanAmount <= 6000) {
        return 3;
    } else if (loanAmount > 6000 && loanAmount <= 10000) {
        return 6;
    } else { // loanAmount > 10000
        return 12;
    }
};

const calculateInstallments = (approvedAmount, interestRate, durationMonths) => {
    if (durationMonths <= 0) {
        throw new Error("Installment duration must be a positive number.");
    }

    const totalInterest = approvedAmount * (interestRate / 100);
    const totalAmountToRepay = approvedAmount + totalInterest;
    const monthlyEMI = totalAmountToRepay / durationMonths;

    const installments = [];
    let remainingAmount = totalAmountToRepay;
    let currentDueDate = new Date(); // Start from current month

    for (let i = 1; i <= durationMonths; i++) {
        const amount = (i === durationMonths) ? remainingAmount : monthlyEMI; // Ensure last installment covers remainder due to floating point
        currentDueDate.setMonth(currentDueDate.getMonth() + 1); // Add one month

        installments.push({
            installmentNumber: i,
            amountDue: parseFloat(amount.toFixed(2)), // Format to 2 decimal places
            dueDate: new Date(currentDueDate) // Clone date to avoid reference issues
        });
        remainingAmount -= amount;
    }

    return { totalAmountToRepay, monthlyEMI: parseFloat(monthlyEMI.toFixed(2)), installments };
};

module.exports = {
    calculateLoanEligibility,
    calculateInstallmentDuration,
    calculateInstallments
};