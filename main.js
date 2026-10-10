// main.js
import { logoutUser, getCurrentUser } from './auth.js';
import { saveBill, getBills, updateBill, softDeleteBill, restoreBill, permanentlyDeleteBill, saveCompany, updateCompany, getCompanies } from './db.js';
// ==========================================
// Initialization & Global Variables
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Set user info
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    if (user) {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');
        if(userNameDisplay) userNameDisplay.textContent = user;
        if(userAvatar) userAvatar.textContent = user.charAt(0).toUpperCase();
    }

    initNavigation();
    initNewBillLogic();
    initDashboard();
    initModals();
    
    // Setup Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await logoutUser();
    });
});

// ==========================================
// Modals & Client Management Logic
// ==========================================
let allClients = [];

function initModals() {
    const addClientModal = document.getElementById('addClientModal');
    const selectClientModal = document.getElementById('selectClientModal');
    const closeButtons = document.querySelectorAll('.closeModal');

    // Close Modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            addClientModal.classList.add('hidden');
            selectClientModal.classList.add('hidden');
        });
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('logoutBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging out...';
        await logoutUser();
    });

    let currentEditingClientId = null;

    // Add Client Button in Companies View
    document.getElementById('addCompanyBtn').addEventListener('click', () => {
        currentEditingClientId = null;
        document.getElementById('clientModalTitle').textContent = "Client Details";
        document.getElementById('newClientName').value = '';
        document.getElementById('newClientAddress').value = '';
        document.getElementById('newClientMobile').value = '';
        document.getElementById('newClientState').value = '';
        document.getElementById('newClientStateCode').value = '';
        document.getElementById('newClientGST').value = '';
        addClientModal.classList.remove('hidden');
    });

    // Make it globally accessible for the edit handler at bottom
    window.setEditingClient = (id) => { currentEditingClientId = id; };

    // Companies Search
    document.getElementById('companiesSearchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!window.allCompaniesData) return;
        const filtered = window.allCompaniesData.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.mobile && c.mobile.includes(term)) ||
            (c.gst && c.gst.toLowerCase().includes(term))
        );
        window.renderCompaniesGrid(filtered);
    });

    // Save New Client
    document.getElementById('saveClientBtn').addEventListener('click', async () => {
        const name = document.getElementById('newClientName').value.trim();
        if (!name) {
            alert("Client name is required.");
            return;
        }
        
        const clientData = {
            name: name,
            address: document.getElementById('newClientAddress').value.trim(),
            mobile: document.getElementById('newClientMobile').value.trim(),
            state: document.getElementById('newClientState').value.trim(),
            stateCode: document.getElementById('newClientStateCode').value.trim(),
            gst: document.getElementById('newClientGST').value.trim()
        };

        const btn = document.getElementById('saveClientBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        let result;
        if (currentEditingClientId) {
            result = await updateCompany(currentEditingClientId, clientData);
        } else {
            result = await saveCompany(clientData);
        }

        if (result.success) {
            addClientModal.classList.add('hidden');
            loadCompanies();
        } else {
            alert("Failed to save client: " + result.message);
        }
        
        btn.disabled = false;
        btn.textContent = 'Save Client';
    });

    // Select Existing Client Button in New Bill View
    document.getElementById('selectClientBtn').addEventListener('click', async () => {
        selectClientModal.classList.remove('hidden');
        const container = document.getElementById('clientListContainer');
        container.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">Loading clients...</div>';
        
        const { success, data } = await getCompanies();
        if (success) {
            allClients = data;
            renderClientList(allClients);
        } else {
            container.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Failed to load clients.</div>';
        }
    });

    // Search Client in Modal
    document.getElementById('searchClientInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allClients.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.gst && c.gst.toLowerCase().includes(term))
        );
        renderClientList(filtered);
    });
}

function renderClientList(clients) {
    const container = document.getElementById('clientListContainer');
    container.innerHTML = '';
    
    if (clients.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">No clients found.</div>';
        return;
    }

    clients.forEach(client => {
        const div = document.createElement('div');
        div.className = "p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer flex justify-between items-center transition-colors";
        div.innerHTML = `
            <div>
                <div class="font-semibold text-gray-800">${client.name}</div>
                <div class="text-xs text-gray-500">${client.state || ''} ${client.gst ? '| GST: ' + client.gst : ''}</div>
            </div>
            <button class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-medium">Select</button>
        `;
        div.addEventListener('click', () => {
            // Auto-fill bill form
            if (document.getElementById('clientName')) document.getElementById('clientName').value = client.name || '';
            if (document.getElementById('clientAddress')) document.getElementById('clientAddress').value = client.address || '';
            if (document.getElementById('clientMobile')) document.getElementById('clientMobile').value = client.mobile || '';
            if (document.getElementById('clientState')) document.getElementById('clientState').value = client.state || '';
            if (document.getElementById('clientStateCode')) document.getElementById('clientStateCode').value = client.stateCode || '';
            if (document.getElementById('clientGST')) document.getElementById('clientGST').value = client.gst || '';
            
            // Try to set shipped to as well
            if(document.getElementById('shipName')) document.getElementById('shipName').value = client.name || '';
            if(document.getElementById('shipAddress')) document.getElementById('shipAddress').value = client.address || '';
            if(document.getElementById('shipMobile')) document.getElementById('shipMobile').value = client.mobile || '';
            if(document.getElementById('shipState')) document.getElementById('shipState').value = client.state || '';
            if(document.getElementById('shipStateCode')) document.getElementById('shipStateCode').value = client.stateCode || '';
            if(document.getElementById('shipGST')) document.getElementById('shipGST').value = client.gst || '';
            
            document.getElementById('selectClientModal').classList.add('hidden');
        });
        container.appendChild(div);
    });
}

// ==========================================
// Navigation Logic
// ==========================================
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            
            // Update active link styling
            navLinks.forEach(l => {
                l.classList.remove('bg-gray-800', 'text-white');
                l.classList.add('text-gray-400');
            });
            link.classList.remove('text-gray-400');
            link.classList.add('bg-gray-800', 'text-white');

            // Show target view
            viewSections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Trigger specific view logic
            if (targetView === 'history') loadHistory();
            if (targetView === 'trash') loadTrash();
            if (targetView === 'dashboard') initDashboard();
            if (targetView === 'companies') loadCompanies();
        });
    });
}

// ==========================================
// New Bill Logic
// ==========================================
function initNewBillLogic() {
    // Default Date to today
    const today = new Date();
    document.getElementById('invoiceDate').value = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    
    // Sync billing entity name to print view
    const entitySelect = document.getElementById('billingEntity');
    const printEntity = document.getElementById('printBillingEntity');
    const printEntitySign = document.getElementById('printBillingEntitySign');
    
    entitySelect.addEventListener('change', (e) => {
        const cName = e.target.value;
        if(printEntity) printEntity.textContent = cName;
        if(printEntitySign) printEntitySign.textContent = cName;
        
        const storeGstInput = document.getElementById('storeGst');
        const printBillingAddress1 = document.getElementById('printBillingAddress1');
        const printBillingAddress2 = document.getElementById('printBillingAddress2');

        if (storeGstInput) {
            if (cName === 'SRI IYYAPPA FASHION') storeGstInput.value = '33CZYPS0122A1ZK';
            else if (cName === 'NAINIKA FASHION') storeGstInput.value = '33BKHPB0870K1ZD';
            else if (cName === 'PRAVEEN TEX') storeGstInput.value = '33BDPPN3944P1ZT';
            else if (cName === 'G.K.GARMENTS') storeGstInput.value = '33AHAPG5310Q1ZI';
        }

        if (printBillingAddress1 && printBillingAddress2) {
            if (cName === 'G.K.GARMENTS') {
                printBillingAddress1.textContent = '20\\13 APPACHI NAGAR 4TH STREET KONGU MAIN ROAD,';
                printBillingAddress2.textContent = 'TIRUPUR 641 607 MOBILE-9688704766';
            } else if (cName === 'SRI IYYAPPA FASHION') {
                printBillingAddress1.textContent = '6/1 THIRUMALAI NAGAR 3RD CROSS STREET TIRUPUR 641602';
                printBillingAddress2.textContent = 'SHANTHI THEATRE BACK SIDE TIRUPUR-641602 MOBILE-8523938588';
            } else {
                printBillingAddress1.textContent = '48\\1 KAMATCHI AMMAN KOVIL STREET, KUMARANANTHAPURAM, P.N ROAD,';
                printBillingAddress2.textContent = 'TIRUPUR-641602 MOBILE-9688704766';
            }
        }
    });
    // Trigger on load
    entitySelect.dispatchEvent(new Event('change'));

    // Toggle GST / Without GST
    const toggleRadios = document.getElementsByName('billTypeToggle');
    const withGstContainer = document.getElementById('withGstContainer');
    const withoutGstPlaceholder = document.getElementById('withoutGstPlaceholder');
    
    if(toggleRadios.length > 0) {
        toggleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'with_gst') {
                    withGstContainer.classList.remove('hidden');
                    withoutGstPlaceholder.classList.add('hidden');
                } else {
                    withGstContainer.classList.add('hidden');
                    withoutGstPlaceholder.classList.remove('hidden');
                }
            });
        });
    }

    const totalDisplay = document.getElementById('invoiceTotal');
    const cgstRate = document.getElementById('cgstRate');
    const sgstRate = document.getElementById('sgstRate');
    const igstRate = document.getElementById('igstRate');
    const cgstAmt = document.getElementById('cgstAmt');
    const sgstAmt = document.getElementById('sgstAmt');
    const igstAmt = document.getElementById('igstAmt');
    const grandTotalAmt = document.getElementById('grandTotalAmt');

    function numberToWords(num) {
        if (num === 0) return 'Zero Only';
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        const numToWords = (n) => {
            let str = '';
            if (n > 99) {
                str += a[Math.floor(n / 100)] + 'Hundred ';
                n %= 100;
            }
            if (n > 19) {
                str += b[Math.floor(n / 10)] + ' ';
                n %= 10;
            }
            if (n > 0) {
                str += a[n];
            }
            return str.trim();
        };
        
        const parts = num.toString().split('.');
        let rupees = parseInt(parts[0], 10);
        let paise = parts.length > 1 ? parseInt(parts[1].substring(0, 2).padEnd(2, '0'), 10) : 0;
        
        let res = '';
        if (rupees > 9999999) {
            res += numToWords(Math.floor(rupees / 10000000)) + ' Crore ';
            rupees %= 10000000;
        }
        if (rupees > 99999) {
            res += numToWords(Math.floor(rupees / 100000)) + ' Lakh ';
            rupees %= 100000;
        }
        if (rupees > 999) {
            res += numToWords(Math.floor(rupees / 1000)) + ' Thousand ';
            rupees %= 1000;
        }
        if (rupees > 0) {
            res += numToWords(rupees) + ' ';
        }
        
        let words = res.trim();
        if (words) words += ' Rupees';
        
        if (paise > 0) {
            words += (words ? ' And ' : '') + numToWords(paise) + ' Paise';
        }
        
        return words + ' Only';
    }

    const calculateTaxes = (amount) => {
        const cgst = amount * ((parseFloat(cgstRate?.value) || 0) / 100);
        const sgst = amount * ((parseFloat(sgstRate?.value) || 0) / 100);
        const igst = amount * ((parseFloat(igstRate?.value) || 0) / 100);
        
        if (cgstAmt) cgstAmt.value = cgst.toFixed(2);
        if (sgstAmt) sgstAmt.value = sgst.toFixed(2);
        if (igstAmt) igstAmt.value = igst.toFixed(2);
        
        // Use Math.max to only add the effective tax amount once
        const totalTax = Math.max(cgst + sgst, igst);
        const grandTotal = amount + totalTax;
        
        if (grandTotalAmt) {
            grandTotalAmt.value = grandTotal.toFixed(2);
            const wordsEl = document.getElementById('rupeesInWords');
            if (wordsEl) {
                wordsEl.value = numberToWords(grandTotal);
            }
        }
    };

    const calculateTotalsFromItems = () => {
        let total = 0;
        document.querySelectorAll('.item-amount').forEach(amtInput => {
            total += parseFloat(amtInput.value) || 0;
        });
        if (totalDisplay) {
            totalDisplay.value = total.toFixed(2);
            calculateTaxes(total);
        }
    };

    const calculateFromTotal = () => {
        const amount = parseFloat(totalDisplay?.value) || 0;
        calculateTaxes(amount);
    };

    const itemsContainer = document.getElementById('itemsContainer');
    if (itemsContainer) {
        itemsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-rate')) {
                const row = e.target.closest('.item-row');
                const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
                const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
                const amountInput = row.querySelector('.item-amount');
                if (amountInput) amountInput.value = (qty * rate).toFixed(2);
                calculateTotalsFromItems();
            } else if (e.target.classList.contains('item-amount')) {
                calculateTotalsFromItems();
            }
        });
    }

    if (totalDisplay) totalDisplay.addEventListener('input', calculateFromTotal);
    if (cgstRate) cgstRate.addEventListener('input', calculateFromTotal);
    if (sgstRate) sgstRate.addEventListener('input', calculateFromTotal);
    if (igstRate) igstRate.addEventListener('input', calculateFromTotal);

    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn && itemsContainer) {
        addRowBtn.addEventListener('click', () => {
            const currentRows = itemsContainer.querySelectorAll('.item-row').length;
            if (currentRows >= 5) {
                alert("Maximum 5 items allowed for this bill format.");
                return;
            }
            
            const newRow = document.createElement('div');
            newRow.className = "flex item-row";
            newRow.innerHTML = `
                <div class="w-8 text-center pt-2 item-sno">${currentRows + 1}</div>
                <div class="w-16 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs" value="6109"></div>
                <div class="flex-1 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs uppercase" placeholder="ITEM"></div>
                <div class="w-10 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs" value="6109"></div>
                <div class="w-16 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-qty" value="0"></div>
                <div class="w-16 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-rate" value="0.00"></div>
                <div class="w-28 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-amount" value="0.00"></div>
            `;
            itemsContainer.appendChild(newRow);
        });
    }

    // Payment Status Logic
    const paymentRadios = document.getElementsByName('paymentStatus');
    const partialContainer = document.getElementById('partialAmountContainer');
    
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Half Collected') {
                partialContainer.classList.remove('hidden');
            } else {
                partialContainer.classList.add('hidden');
            }
        });
    });

    // Print & Save
    document.getElementById('savePrintBtn').addEventListener('click', async () => {
        // Collect Data
        const grandTotalAmt = document.getElementById('grandTotalAmt');
        const totalAmt = grandTotalAmt ? parseFloat(grandTotalAmt.value) : 0;
        const selectedRadio = Array.from(paymentRadios).find(r => r.checked).value;
        let receivedAmt = 0;
        if (selectedRadio === 'Fully Collected') receivedAmt = totalAmt;
        if (selectedRadio === 'Half Collected') receivedAmt = parseFloat(document.getElementById('amountReceived').value) || 0;

        // Collect items
        const items = [];
        const itemRows = document.querySelectorAll('#itemsContainer .item-row');
        itemRows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            const hsn1 = inputs[0]?.value || '';
            const desc = inputs[1]?.value || '';
            const hsn2 = inputs[2]?.value || '';
            const qty = parseFloat(inputs[3]?.value) || 0;
            const rate = parseFloat(inputs[4]?.value) || 0;
            const amount = parseFloat(inputs[5]?.value) || 0;
            if (desc || qty > 0) {
                items.push({ sno: index + 1, hsn1, desc, hsn2, qty, rate, amount });
            }
        });

        const billData = {
            invoiceNo: document.getElementById('invoiceNo')?.value,
            date: document.getElementById('invoiceDate')?.value,
            billingEntity: entitySelect.value,
            clientName: document.getElementById('clientName')?.value,
            totalAmount: totalAmt,
            paymentStatus: selectedRadio,
            amountReceived: receivedAmt,
            pendingAmount: totalAmt - receivedAmt,
            
            // Full bill extra data:
            storeGst: document.getElementById('storeGst')?.value,
            transportMode: document.getElementById('transportMode')?.value,
            supplyDateTime: document.getElementById('supplyDateTime')?.value,
            placeOfSupply: document.getElementById('placeOfSupply')?.value,
            clientAddress: document.getElementById('clientAddress')?.value,
            clientMobile: document.getElementById('clientMobile')?.value,
            clientState: document.getElementById('clientState')?.value,
            clientStateCode: document.getElementById('clientStateCode')?.value,
            clientGST: document.getElementById('clientGST')?.value,
            shipName: document.getElementById('shipName')?.value,
            shipAddress: document.getElementById('shipAddress')?.value,
            shipMobile: document.getElementById('shipMobile')?.value,
            shipState: document.getElementById('shipState')?.value,
            shipStateCode: document.getElementById('shipStateCode')?.value,
            shipGST: document.getElementById('shipGST')?.value,
            items: items,
            invoiceTotal: document.getElementById('invoiceTotal')?.value,
            cgstRate: document.getElementById('cgstRate')?.value,
            cgstAmt: document.getElementById('cgstAmt')?.value,
            sgstRate: document.getElementById('sgstRate')?.value,
            sgstAmt: document.getElementById('sgstAmt')?.value,
            igstRate: document.getElementById('igstRate')?.value,
            igstAmt: document.getElementById('igstAmt')?.value,
            grandTotalAmt: grandTotalAmt?.value,
            rupeesInWords: document.getElementById('rupeesInWords')?.value
        };

        // Validate basic fields
        if (!billData.clientName) {
            alert('Please enter Client Name');
            return;
        }

        // Save to DB
        const result = await saveBill(billData);
        if (result.success) {
            // Trigger Print
            window.print();
        } else {
            alert('Failed to save bill');
        }
    });

    // Clear Form
    document.getElementById('clearBillBtn').addEventListener('click', () => {
        if(confirm("Are you sure you want to clear the bill?")) {
            document.getElementById('clientName').value = '';
            document.getElementById('clientAddress').value = '';
            document.getElementById('clientMobile').value = '';
            document.getElementById('clientState').value = '';
            document.getElementById('clientGST').value = '';
            
            // Remove extra rows
            if (itemsContainer) {
                const rows = itemsContainer.querySelectorAll('.item-row');
                for (let i = 1; i < rows.length; i++) {
                    rows[i].remove();
                }
                const firstRow = rows[0];
                if (firstRow) {
                    const qtyInput = firstRow.querySelector('.item-qty');
                    const rateInput = firstRow.querySelector('.item-rate');
                    if(qtyInput) qtyInput.value = '1';
                    if(rateInput) rateInput.value = '500';
                }
            }
            
            if(document.getElementById('cgstRate')) document.getElementById('cgstRate').value = '2.5';
            if(document.getElementById('sgstRate')) document.getElementById('sgstRate').value = '2.5';
            if(document.getElementById('igstRate')) document.getElementById('igstRate').value = '0';
            calculateTotalsFromItems();
            if(paymentRadios[2]) paymentRadios[2].checked = true; // Set to Not Collected
            if(partialContainer) partialContainer.classList.add('hidden');
        }
    });
}

// ==========================================
// Dashboard Logic
// ==========================================
window.viewClientBills = (clientName) => {
    // Set the search to client name to filter
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
        searchInput.value = clientName;
    }
    
    const clrBtn = document.getElementById('clearHistoryFiltersBtn');
    if(clrBtn) clrBtn.classList.remove('hidden');

    // Switch to history tab
    const historyLink = document.querySelector('a[data-view="history"]');
    if (historyLink) historyLink.click();
};

window.viewCompanyBills = (companyName) => {
    // Switch to history tab
    const historyLink = document.querySelector('a[data-view="history"]');
    if (historyLink) historyLink.click();
    
    // Set the filter
    const companyFilter = document.getElementById('historyCompanyFilter');
    if (companyFilter) {
        const uppercaseName = companyName.toUpperCase();
        let found = false;
        for (let i = 0; i < companyFilter.options.length; i++) {
            if (companyFilter.options[i].value === uppercaseName) {
                companyFilter.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (!found) companyFilter.value = 'all'; // Fallback
        
        const clrBtn = document.getElementById('clearHistoryFiltersBtn');
        if(clrBtn) clrBtn.classList.remove('hidden');

        // Trigger history table render
        if (typeof renderHistoryTable === 'function') {
            renderHistoryTable();
        }
    }
};

window.toggleCustomDateDash = () => {
    const filter = document.getElementById('dashboardDateFilter').value;
    const customDiv = document.getElementById('customDateFilter');
    if (customDiv) {
        if (filter === 'custom') {
            customDiv.classList.remove('hidden');
            customDiv.classList.add('flex');
        } else {
            customDiv.classList.add('hidden');
            customDiv.classList.remove('flex');
        }
    }
};

function parseBillDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}

let globalBillsCache = null;

window.refreshData = async () => {
    const { success, data: allBills } = await getBills(false);
    if (success) {
        globalBillsCache = allBills;
    }
    return success;
};

window.initDashboard = initDashboard;
async function initDashboard(forceRefresh = false) {
    if (!globalBillsCache || forceRefresh === true) {
        await window.refreshData();
    }
    if (!globalBillsCache) return;
    const allBills = globalBillsCache;

    // Filter logic
    const filterSelect = document.getElementById('dashboardDateFilter');
    const filterType = filterSelect ? filterSelect.value : 'today';
    
    let startDate = null;
    let endDate = null;
    
    const now = new Date();
    now.setHours(0,0,0,0);
    
    if (filterType === 'today') {
        startDate = new Date(now);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    } else if (filterType === 'this_week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    } else if (filterType === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filterType === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filterType === 'custom') {
        const customStart = document.getElementById('dashStartDate').value;
        const customEnd = document.getElementById('dashEndDate').value;
        if (customStart) startDate = new Date(customStart);
        if (customEnd) {
            endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);
        }
    }
    
    const bills = allBills.filter(bill => {
        if (filterType === 'overall') return true;
        
        const billDate = parseBillDate(bill.date);
        if (startDate && billDate < startDate) return false;
        if (endDate && billDate > endDate) return false;
        return true;
    });

    let totalRevenue = 0;
    let totalPending = 0;
    let totalReceived = 0;
    
    const companyStats = {};
    
    // Ensure all known companies appear on the dashboard
    allBills.forEach(bill => {
        const cName = bill.billingEntity || 'Unknown';
        if (!companyStats[cName]) {
            companyStats[cName] = { revenue: 0, received: 0, pending: 0, count: 0 };
        }
    });

    bills.forEach(bill => {
        totalRevenue += bill.totalAmount || 0;
        totalReceived += bill.amountReceived || 0;
        totalPending += bill.pendingAmount || 0;
        
        const cName = bill.billingEntity || 'Unknown';
        if (companyStats[cName]) {
            companyStats[cName].revenue += bill.totalAmount || 0;
            companyStats[cName].received += bill.amountReceived || 0;
            companyStats[cName].pending += bill.pendingAmount || 0;
            companyStats[cName].count += 1;
        }
    });

    document.getElementById('widgetRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('widgetPending').textContent = `₹${totalPending.toFixed(2)}`;
    document.getElementById('widgetReceived').textContent = `₹${totalReceived.toFixed(2)}`;
    document.getElementById('widgetBillsCount').textContent = bills.length;
    
    // Render Company Cards
    const companyGrid = document.getElementById('dashboardCompanyGrid');
    if (companyGrid) {
        companyGrid.innerHTML = '';
        Object.keys(companyStats).forEach(cName => {
            const stats = companyStats[cName];
            
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                    <h3 class="text-lg font-bold text-gray-800 uppercase">${cName}</h3>
                    <span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">${stats.count} Bills</span>
                </div>
                <div class="space-y-3 mb-5">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500">Total Revenue:</span>
                        <span class="font-semibold text-gray-800">₹${stats.revenue.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-green-600 font-medium">Received:</span>
                        <span class="font-bold text-green-600">₹${stats.received.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-red-500 font-medium">Pending:</span>
                        <span class="font-bold text-red-500">₹${stats.pending.toFixed(2)}</span>
                    </div>
                </div>
                <button onclick="window.viewCompanyBills('${cName}')" class="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-list"></i> View Bills
                </button>
            `;
            companyGrid.appendChild(card);
        });
    }
}

// ==========================================
// History View Logic
// ==========================================
let cachedBills = [];

async function loadHistory() {
    const { success, data: bills } = await getBills(false);
    if (!success) return;
    cachedBills = bills;
    renderHistoryTable();
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dateFilter = document.getElementById('historyDateFilter')?.value || 'all';
    const specificDate = document.getElementById('historySpecificDate')?.value;
    const companyFilter = document.getElementById('historyCompanyFilter')?.value || 'all';
    const searchStr = (document.getElementById('historySearchInput')?.value || '').toLowerCase();

    // Toggle specific date input visibility
    const specificDateInput = document.getElementById('historySpecificDate');
    if (specificDateInput) {
        if (dateFilter === 'select') {
            specificDateInput.classList.remove('hidden');
        } else {
            specificDateInput.classList.add('hidden');
        }
    }

    const sortFilter = document.getElementById('historySortFilter')?.value || 'date-desc';

    let filteredBills = cachedBills.filter(bill => {
        // Date check
        let dateMatch = true;
        if (dateFilter === 'select' && specificDate) {
            // specificDate from input type="date" is YYYY-MM-DD
            const [y, m, d] = specificDate.split('-');
            const formattedSearchDate = `${d}.${m}.${y}`; // e.g. 14.09.2026
            dateMatch = (bill.date || '').includes(formattedSearchDate) || (bill.date || '') === specificDate;
        }
        
        // Company check
        let companyMatch = true;
        if (companyFilter !== 'all') {
            companyMatch = (bill.billingEntity || '').toLowerCase() === companyFilter.toLowerCase();
        }

        // Search check
        let searchMatch = true;
        if (searchStr) {
            searchMatch = (
                (bill.clientName || '').toLowerCase().includes(searchStr) ||
                (bill.invoiceNo || '').toLowerCase().includes(searchStr) ||
                (bill.date || '').toLowerCase().includes(searchStr)
            );
        }

        return dateMatch && companyMatch && searchMatch;
    });

    // Apply sorting
    filteredBills.sort((a, b) => {
        if (sortFilter.startsWith('date')) {
            // date format is DD.MM.YYYY
            const dateA = a.date ? a.date.split('.').reverse().join('') : '';
            const dateB = b.date ? b.date.split('.').reverse().join('') : '';
            if (sortFilter === 'date-desc') {
                return dateB.localeCompare(dateA);
            } else {
                return dateA.localeCompare(dateB);
            }
        } else if (sortFilter.startsWith('amount')) {
            const amtA = a.totalAmount || 0;
            const amtB = b.totalAmount || 0;
            if (sortFilter === 'amount-desc') {
                return amtB - amtA;
            } else {
                return amtA - amtB;
            }
        }
        return 0;
    });

    const headerCheckbox = document.getElementById('selectAllHistory');
    if (headerCheckbox && headerCheckbox.parentElement) {
        if (window.isMultiSelectEnabled) {
            headerCheckbox.parentElement.classList.remove('hidden');
        } else {
            headerCheckbox.parentElement.classList.add('hidden');
        }
    }

    filteredBills.forEach(bill => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-50 transition-colors duration-150 group";
        
        // Status Badge Logic
        let statusBadge = '';
        if (bill.paymentStatus === 'Fully Collected') {
            statusBadge = `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Fully Paid</span>`;
        } else if (bill.paymentStatus === 'Half Collected') {
            statusBadge = `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Partial</span>`;
        } else {
            statusBadge = `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Unpaid</span>`;
        }
        
        // Balance (Pending Amount) Display
        let pending = bill.pendingAmount !== undefined ? bill.pendingAmount : (bill.totalAmount || 0) - (bill.amountReceived || 0);
        let balanceHtml = '';
        if (pending > 0) {
            balanceHtml = `<span class="font-bold text-red-500">₹${pending.toFixed(2)}</span>`;
        } else {
            balanceHtml = `<span class="text-green-500 font-medium">₹0.00</span>`;
        }

        // Action Buttons
        let markPaidBtn = '';
        if (pending > 0) {
            markPaidBtn = `<button onclick="window.markPaidHandler('${bill.id}')" class="text-green-600 hover:text-green-800 hover:bg-green-100 p-2 rounded-full transition-colors ml-1" title="Mark as Fully Paid"><i class="fa-solid fa-check-circle"></i></button>`;
        }

        const multiselectClass = window.isMultiSelectEnabled ? 'multiselect-col' : 'multiselect-col hidden';
        tr.innerHTML = `
            <td class="py-4 px-4 text-center ${multiselectClass}">
                <input type="checkbox" value="${bill.id}" class="history-checkbox rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer w-4 h-4" onchange="window.updateBulkDeleteBtn()">
            </td>
            <td class="py-4 px-6">${bill.date || '-'}</td>
            <td class="py-4 px-6 font-medium text-gray-900">${bill.invoiceNo || '-'}</td>
            <td class="py-4 px-6">${bill.clientName}</td>
            <td class="py-4 px-6 font-semibold">₹${bill.totalAmount.toFixed(2)}</td>
            <td class="py-4 px-6">${balanceHtml}</td>
            <td class="py-4 px-6">${statusBadge}</td>
            <td class="py-4 px-6 text-right whitespace-nowrap">
                <div class="flex justify-end items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    ${markPaidBtn}
                    <button onclick="window.viewBillHandler('${bill.id}')" class="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 p-2 rounded-full transition-colors" title="View Details"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="window.downloadBillHandler('${bill.id}')" class="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors" title="Download Summary"><i class="fa-solid fa-download"></i></button>
                    <button onclick="window.deleteBillHandler('${bill.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-full transition-colors" title="Move to Trash">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateBulkDeleteBtn = () => {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    const btn = document.getElementById('bulkDeleteBtn');
    if (btn) {
        if (checkboxes.length > 0) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    }
};

window.isMultiSelectEnabled = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toggleSelectBtn')?.addEventListener('click', () => {
        window.isMultiSelectEnabled = !window.isMultiSelectEnabled;
        const btn = document.getElementById('toggleSelectBtn');
        if (window.isMultiSelectEnabled) {
            btn.innerHTML = '<i class="fa-solid fa-xmark mr-1"></i> Cancel Select';
            btn.classList.add('bg-indigo-50', 'text-indigo-600', 'border-indigo-200');
            btn.classList.remove('bg-gray-100', 'text-gray-700', 'border-gray-200');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-check-square mr-1"></i> Select';
            btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'border-indigo-200');
            btn.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-200');
            
            // Uncheck all and hide bulk delete
            const checkboxes = document.querySelectorAll('.history-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            const selectAll = document.getElementById('selectAllHistory');
            if(selectAll) selectAll.checked = false;
            window.updateBulkDeleteBtn();
        }
        renderHistoryTable();
    });

    document.getElementById('selectAllHistory')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.history-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        window.updateBulkDeleteBtn();
    });

    document.getElementById('bulkDeleteBtn')?.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.history-checkbox:checked');
        if(checkboxes.length === 0) return;
        
        if(confirm(`Move ${checkboxes.length} selected bills to trash?`)) {
            for(let cb of checkboxes) {
                await softDeleteBill(cb.value);
            }
            const selectAll = document.getElementById('selectAllHistory');
            if (selectAll) selectAll.checked = false;
            window.updateBulkDeleteBtn();
            loadHistory();
            initDashboard();
        }
    });
});

window.markPaidHandler = async (id) => {
    if(confirm("Mark this bill as fully paid?")) {
        const bill = cachedBills.find(b => b.id === id);
        if(bill) {
            await updateBill(id, {
                amountReceived: bill.totalAmount,
                pendingAmount: 0,
                paymentStatus: 'Fully Collected'
            });
            loadHistory();
            initDashboard();
        }
    }
};

window.generateBillElement = (bill) => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return null;
    const clone = printArea.cloneNode(true);
    clone.id = 'pdf-clone-' + Math.random();
    
    const setValue = (id, val) => {
        const el = clone.querySelector(`#${id}`);
        if (el) {
            el.setAttribute('value', val || '');
            if(el.tagName === 'INPUT') el.value = val || '';
            if(el.tagName === 'TEXTAREA') el.textContent = val || '';
            if(el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.textContent = val || '';
        }
    };
    
    setValue('storeGst', bill.storeGst);
    setValue('printBillingEntity', bill.billingEntity);
    const signEl = clone.querySelector('#printBillingEntitySign');
    if (signEl) signEl.textContent = bill.billingEntity;
    
    setValue('invoiceNo', bill.invoiceNo);
    setValue('invoiceDate', bill.date);
    setValue('transportMode', bill.transportMode);
    setValue('supplyDateTime', bill.supplyDateTime);
    setValue('placeOfSupply', bill.placeOfSupply);
    
    setValue('clientName', bill.clientName);
    setValue('clientAddress', bill.clientAddress);
    setValue('clientMobile', bill.clientMobile);
    setValue('clientState', bill.clientState);
    setValue('clientStateCode', bill.clientStateCode);
    setValue('clientGST', bill.clientGST);
    
    setValue('shipName', bill.shipName);
    setValue('shipAddress', bill.shipAddress);
    setValue('shipMobile', bill.shipMobile);
    setValue('shipState', bill.shipState);
    setValue('shipStateCode', bill.shipStateCode);
    setValue('shipGST', bill.shipGST);
    
    setValue('invoiceTotal', bill.invoiceTotal);
    setValue('cgstRate', bill.cgstRate);
    setValue('cgstAmt', bill.cgstAmt);
    setValue('sgstRate', bill.sgstRate);
    setValue('sgstAmt', bill.sgstAmt);
    setValue('igstRate', bill.igstRate);
    setValue('igstAmt', bill.igstAmt);
    setValue('grandTotalAmt', bill.grandTotalAmt);
    setValue('rupeesInWords', bill.rupeesInWords);
    
    const itemsContainer = clone.querySelector('#itemsContainer');
    if (itemsContainer && bill.items) {
        itemsContainer.innerHTML = '';
        bill.items.forEach(item => {
            const row = document.createElement('div');
            row.className = "flex item-row";
            row.innerHTML = `
                <div class="w-8 text-center pt-2 item-sno">${item.sno}</div>
                <div class="w-16 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs" value="${item.hsn1}"></div>
                <div class="flex-1 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs uppercase" value="${item.desc}"></div>
                <div class="w-10 text-center pt-2"><input type="text" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs" value="${item.hsn2}"></div>
                <div class="w-16 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-qty" value="${item.qty}"></div>
                <div class="w-16 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-rate" value="${Number(item.rate).toFixed(2)}"></div>
                <div class="w-28 text-center pt-2"><input type="number" class="w-full text-center border-none p-0 outline-none bg-transparent text-xs item-amount" value="${Number(item.amount).toFixed(2)}"></div>
            `;
            itemsContainer.appendChild(row);
        });
    }

    // Convert inputs and textareas to divs for flawless PDF rendering
    const inputs = clone.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        const div = document.createElement('div');
        div.textContent = input.value || input.getAttribute('value') || input.textContent;
        div.className = input.className;
        div.style.cssText = input.style.cssText;
        if (input.tagName === 'TEXTAREA') {
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-word';
        }
        // Force inputs to act like inline-block if they don't have w-full to preserve flex alignments
        if (!div.className.includes('w-full') && !div.className.includes('flex-1')) {
            div.style.display = 'inline-block';
        }
        input.parentNode.replaceChild(div, input);
    });

    return clone;
};

window.viewBillHandler = (id) => {
    const bill = cachedBills.find(b => b.id === id);
    if(bill) {
        const element = window.generateBillElement(bill);
        
        // Extract just the print wrapper to avoid nested containers
        const wrapper = element.querySelector('.print-wrapper');
        if (!wrapper) return;
        
        // Remove fixed height so it prints naturally in A4
        wrapper.style.height = 'auto';
        wrapper.style.minHeight = '265mm';

        // Create temporary print container
        const tempContainer = document.createElement('div');
        tempContainer.id = 'history-print-area';
        tempContainer.className = 'bg-white text-black font-sans print:w-full';
        
        // Match standard print area styling
        tempContainer.appendChild(wrapper);
        document.body.appendChild(tempContainer);

        // Add class to hide main dashboard during print
        document.body.classList.add('history-printing');

        setTimeout(() => {
            window.print();
            
            // Clean up after print dialog closes
            document.body.classList.remove('history-printing');
            document.body.removeChild(tempContainer);
        }, 150);
    }
};

window.downloadBillHandler = window.viewBillHandler;

// Attach event listeners immediately for filters
setTimeout(() => {
    document.getElementById('historyDateFilter')?.addEventListener('change', renderHistoryTable);
    document.getElementById('historySpecificDate')?.addEventListener('input', renderHistoryTable);
    document.getElementById('historyCompanyFilter')?.addEventListener('change', renderHistoryTable);
    document.getElementById('historySortFilter')?.addEventListener('change', renderHistoryTable);
    document.getElementById('historySearchInput')?.addEventListener('input', renderHistoryTable);
    
    document.getElementById('clearHistoryFiltersBtn')?.addEventListener('click', () => {
        const df = document.getElementById('historyDateFilter');
        if (df) df.value = 'all';
        const sdate = document.getElementById('historySpecificDate');
        if (sdate) { sdate.value = ''; sdate.classList.add('hidden'); }
        const cf = document.getElementById('historyCompanyFilter');
        if (cf) cf.value = 'all';
        const search = document.getElementById('historySearchInput');
        if (search) search.value = '';
        
        document.getElementById('clearHistoryFiltersBtn').classList.add('hidden');
        renderHistoryTable();
    });
}, 100);

// Global handler for inline onclick
window.deleteBillHandler = async (id) => {
    if(confirm("Move this bill to trash?")) {
        await softDeleteBill(id);
        loadHistory();
        initDashboard();
    }
};

// ==========================================
// Trash View Logic
// ==========================================
let isTrashSelectMode = false;

async function loadTrash() {
    const { success, data: bills } = await getBills(true); // Get deleted ones
    if (!success) return;

    const tbody = document.getElementById('trashTableBody');
    tbody.innerHTML = '';

    bills.forEach(bill => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="trash-select-col hidden py-4 px-6"><input type="checkbox" class="trash-row-checkbox rounded text-red-600" value="${bill.id}"></td>
            <td class="py-4 px-6">${bill.date || '-'}</td>
            <td class="py-4 px-6 font-medium text-gray-500 line-through">${bill.invoiceNo || '-'}</td>
            <td class="py-4 px-6 text-gray-500">${bill.clientName}</td>
            <td class="py-4 px-6 text-right">
                <button onclick="window.restoreBillHandler('${bill.id}')" class="text-green-600 hover:text-green-800 mr-3 btn border border-green-200 px-3 py-1 rounded text-xs bg-green-50">
                    <i class="fa-solid fa-rotate-left"></i> Restore
                </button>
                <button onclick="window.permanentDeleteHandler('${bill.id}')" class="text-red-600 hover:text-red-800 btn border border-red-200 px-3 py-1 rounded text-xs bg-red-50">
                    <i class="fa-solid fa-xmark"></i> Permanent Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (isTrashSelectMode) {
        document.querySelectorAll('.trash-select-col').forEach(col => col.classList.remove('hidden'));
    }
}

window.restoreBillHandler = async (id) => {
    await restoreBill(id);
    loadTrash();
};

window.permanentDeleteHandler = async (id) => {
    if(confirm("PERMANENTLY delete this bill? This cannot be undone.")) {
        await permanentlyDeleteBill(id);
        loadTrash();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const toggleTrashSelectBtn = document.getElementById('toggleTrashSelectBtn');
    const bulkTrashDeleteBtn = document.getElementById('bulkTrashDeleteBtn');
    const emptyTrashBtn = document.getElementById('emptyTrashBtn');
    const selectAllTrash = document.getElementById('selectAllTrash');

    if(toggleTrashSelectBtn) {
        toggleTrashSelectBtn.addEventListener('click', () => {
            isTrashSelectMode = !isTrashSelectMode;
            if(isTrashSelectMode) {
                toggleTrashSelectBtn.classList.replace('bg-white', 'bg-gray-200');
                bulkTrashDeleteBtn.classList.remove('hidden');
                document.querySelectorAll('.trash-select-col').forEach(col => col.classList.remove('hidden'));
            } else {
                toggleTrashSelectBtn.classList.replace('bg-gray-200', 'bg-white');
                bulkTrashDeleteBtn.classList.add('hidden');
                document.querySelectorAll('.trash-select-col').forEach(col => col.classList.add('hidden'));
            }
        });
    }

    if(selectAllTrash) {
        selectAllTrash.addEventListener('change', (e) => {
            document.querySelectorAll('.trash-row-checkbox').forEach(cb => cb.checked = e.target.checked);
        });
    }

    if(bulkTrashDeleteBtn) {
        bulkTrashDeleteBtn.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('.trash-row-checkbox:checked');
            if(checkboxes.length === 0) return alert("Select bills to remove permanently");
            if(confirm(`PERMANENTLY delete ${checkboxes.length} selected bills?`)) {
                for (let cb of checkboxes) {
                    await permanentlyDeleteBill(cb.value);
                }
                loadTrash();
                if(selectAllTrash) selectAllTrash.checked = false;
            }
        });
    }

    if(emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', async () => {
            const { success, data: bills } = await getBills(true);
            if (!success || bills.length === 0) return alert("Trash is already empty");
            if(confirm(`Are you sure you want to PERMANENTLY EMPTY the trash (${bills.length} bills)? This CANNOT be undone.`)) {
                for (let bill of bills) {
                    await permanentlyDeleteBill(bill.id);
                }
                loadTrash();
                if(selectAllTrash) selectAllTrash.checked = false;
            }
        });
    }
});

// ==========================================
// Companies Logic
// ==========================================
async function loadCompanies() {
    const grid = document.getElementById('companiesGrid');
    grid.innerHTML = '<div class="text-center w-full py-8 text-gray-500 col-span-full">Loading...</div>';

    const { success, data: companies } = await getCompanies();
    if (!success) {
        grid.innerHTML = '<div class="text-center w-full py-8 text-red-500 col-span-full">Failed to load companies</div>';
        return;
    }

    window.allCompaniesData = companies; // Save for editing and searching
    window.renderCompaniesGrid(companies);
}

window.renderCompaniesGrid = (companies) => {
    const grid = document.getElementById('companiesGrid');
    grid.innerHTML = '';
    if (companies.length === 0) {
        grid.innerHTML = '<div class="text-center w-full py-8 text-gray-500 col-span-full">No clients found.</div>';
        return;
    }

    companies.forEach(company => {
        grid.innerHTML += `
            <div class="glass-card p-6 rounded-xl border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow relative group">
                <div class="absolute top-4 right-4 flex gap-2">
                    <button onclick="window.editClientHandler('${company.id}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded" title="Edit Client"><i class="fa-solid fa-pencil"></i></button>
                    <button onclick="window.viewClientBills('${company.name.replace(/'/g, "\\'")}')" class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 p-1.5 rounded" title="View Bills"><i class="fa-solid fa-list"></i></button>
                </div>
                <h3 class="font-bold text-lg mb-1 pr-16 cursor-pointer" onclick="window.viewClientBills('${company.name.replace(/'/g, "\\'")}')">${company.name}</h3>
                <p class="text-sm text-gray-500 mb-2"><i class="fa-solid fa-phone w-4"></i> ${company.mobile || 'N/A'} &nbsp; <i class="fa-solid fa-location-dot w-4 ml-2"></i> ${company.state || 'N/A'}</p>
                <div class="text-xs text-gray-500 mb-4 line-clamp-2 h-8">${company.address || 'No Address'}</div>
                <div class="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded inline-block">GST: ${company.gst || 'N/A'}</div>
            </div>
        `;
    });
}

window.editClientHandler = (id) => {
    const comp = window.allCompaniesData?.find(c => c.id === id);
    if (!comp) return;
    if (window.setEditingClient) window.setEditingClient(id);
    document.getElementById('clientModalTitle').textContent = "Edit Client Details";
    document.getElementById('newClientName').value = comp.name || '';
    document.getElementById('newClientAddress').value = comp.address || '';
    document.getElementById('newClientMobile').value = comp.mobile || '';
    document.getElementById('newClientState').value = comp.state || '';
    document.getElementById('newClientStateCode').value = comp.stateCode || '';
    document.getElementById('newClientGST').value = comp.gst || '';
    document.getElementById('addClientModal').classList.remove('hidden');
};

function updateDashboardDate() {
    const el = document.getElementById('dashboardCurrentDate');
    if (el) {
        el.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
}
setInterval(updateDashboardDate, 60000);
updateDashboardDate();
