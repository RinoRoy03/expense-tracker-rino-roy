const STORAGE_KEY = "rinoExpenseTrackerTransactions";

const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const formError = document.getElementById("formError");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");
const transactionList = document.getElementById("transactionList");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const transactionCount = document.getElementById("transactionCount");

let transactions = loadTransactions();
let editingId = null;

dateInput.value = new Date().toLocaleDateString("en-CA");

function loadTransactions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Could not load saved transactions:", error);
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        console.error("Could not save transactions:", error);
        formError.textContent = "Unable to save data in this browser.";
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(amount);
}

function updateSummary() {
    const totalIncome = transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalExpenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

    document.getElementById("total-income").textContent = formatCurrency(totalIncome);
    document.getElementById("total-expenses").textContent = formatCurrency(totalExpenses);
    document.getElementById("current-balance").textContent =
        formatCurrency(totalIncome - totalExpenses);
}

function updateExpenseChart() {
    const expenseChart = document.getElementById("expenseChart");

    const expenses = transactions.filter(
        item => item.type === "expense"
    );

    if (expenses.length === 0) {
        expenseChart.innerHTML =
            '<p class="empty-message">No expenses to display.</p>';
        return;
    }

    const categoryTotals = {};

    expenses.forEach(transaction => {
        const category = transaction.category;
        const amount = Number(transaction.amount);

        if (categoryTotals[category]) {
            categoryTotals[category] += amount;
        } else {
            categoryTotals[category] = amount;
        }
    });

    const maxAmount = Math.max(...Object.values(categoryTotals));

    expenseChart.innerHTML = "";

    Object.entries(categoryTotals).forEach(([category, total]) => {

        const row = document.createElement("div");
        row.className = "chart-row";

        const categoryName = document.createElement("span");
        categoryName.className = "chart-category";
        categoryName.textContent = category;

        const barContainer = document.createElement("div");
        barContainer.className = "chart-bar-container";

        const bar = document.createElement("div");
        bar.className = "chart-bar";

        const barWidth = (total / maxAmount) * 100;
        bar.style.width = `${barWidth}%`;

        const amount = document.createElement("span");
        amount.className = "chart-amount";
        amount.textContent = formatCurrency(total);

        barContainer.appendChild(bar);

        row.append(
            categoryName,
            barContainer,
            amount
        );

        expenseChart.appendChild(row);
    });
}

function displayTransactions() {
    const selectedType = typeFilter.value;
    const selectedCategory = categoryFilter.value;

    const filtered = transactions
        .filter(item => selectedType === "all" || item.type === selectedType)
        .filter(item => selectedCategory === "all" || item.category === selectedCategory)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    transactionList.innerHTML = "";
    transactionCount.textContent =
        `${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"}`;

    if (filtered.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = transactions.length === 0
            ? "No transactions yet. Add one using the form above."
            : "No transactions match the selected filters.";
        transactionList.appendChild(message);
        return;
    }

    filtered.forEach(transaction => {
        const item = document.createElement("div");
        item.className = "transaction-item";

        const details = document.createElement("div");
        details.className = "transaction-details";

        const description = document.createElement("span");
        description.className = "transaction-description";
        description.textContent = transaction.description || transaction.category;

        const meta = document.createElement("span");
        meta.className = "transaction-meta";
        meta.textContent = `${transaction.category} • ${transaction.date} • ${transaction.type}`;

        const amount = document.createElement("span");
        amount.className = "transaction-amount";
        amount.classList.add(transaction.type === "income" ? "income-amount" : "expense-amount");
        amount.textContent = `${transaction.type === "income" ? "+" : "−"} ${formatCurrency(Number(transaction.amount))}`;

        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => startEditing(transaction.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

        details.append(description, meta);
        actions.append(editButton, deleteButton);
        item.append(details, amount, actions);
        transactionList.appendChild(item);
    });
}

function resetForm() {
    form.reset();
    typeInput.value = "expense";
    dateInput.value = new Date().toLocaleDateString("en-CA");
    editingId = null;
    submitButton.textContent = "Add Transaction";
    cancelEditButton.classList.add("hidden");
    formError.textContent = ""; 
}

function startEditing(id) {
    const transaction = transactions.find(item => item.id === id);
    if (!transaction) return;

    editingId = id;
    typeInput.value = transaction.type;
    amountInput.value = transaction.amount;
    categoryInput.value = transaction.category;
    dateInput.value = transaction.date;
    descriptionInput.value = transaction.description;

    submitButton.textContent = "Update Transaction";
    cancelEditButton.classList.remove("hidden");
    formError.textContent = "";
    document.getElementById("form-heading").textContent = "Edit Transaction";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteTransaction(id) {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;

    transactions = transactions.filter(item => item.id !== id);
    if (editingId === id) resetForm();
    saveTransactions();
    updateSummary();
    updateExpenseChart();
    displayTransactions();
}

form.addEventListener("submit", event => {
    event.preventDefault();
    formError.textContent = "";

    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;
    const description = descriptionInput.value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
        formError.textContent = "Enter an amount greater than zero.";
        amountInput.focus();
        return;
    }

    if (!category) {
        formError.textContent = "Please select a category.";
        categoryInput.focus();
        return;
    }

    if (!date || Number.isNaN(Date.parse(date))) {
        formError.textContent = "Please select a valid date.";
        dateInput.focus();
        return;
    }

    if (editingId !== null) {
        const index = transactions.findIndex(item => item.id === editingId);
        if (index === -1) {
            formError.textContent = "This transaction could not be found. Please try again.";
            resetForm();
            return;
        }

        transactions[index] = {
            ...transactions[index],
            type,
            amount: Math.round(amount * 100) / 100,
            category,
            date,
            description
        };
    } else {
        transactions.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type,
            amount: Math.round(amount * 100) / 100,
            category,
            date,
            description,
            createdAt: Date.now()
        });
    }

    saveTransactions();
    resetForm();
    document.getElementById("form-heading").textContent = "Add Transaction";
    updateSummary();
    updateExpenseChart();
    displayTransactions();
});

cancelEditButton.addEventListener("click", () => {
    resetForm();
    document.getElementById("form-heading").textContent = "Add Transaction";
});

typeFilter.addEventListener("change", displayTransactions);
categoryFilter.addEventListener("change", displayTransactions);

document.getElementById("clearFilters").addEventListener("click", () => {
    typeFilter.value = "all";
    categoryFilter.value = "all";
    displayTransactions();
});

updateSummary();
displayTransactions();
updateExpenseChart();