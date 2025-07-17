 // ==================== CALCULATOR ====================
        function initCalculator() {
            const calculator = document.querySelector('.calculator-buttons');
            const displayCurrent = document.getElementById('calc-current');
            const displayHistory = document.getElementById('calc-history');

            let currentInput = '0';
            let previousInput = '';
            let operation = null;
            let resetScreen = false;

            calculator.addEventListener('click', function (e) {
                if (!e.target.classList.contains('calc-btn')) return;

                const value = e.target.getAttribute('data-value');

                if (value >= '0' && value <= '9') {
                    appendNumber(value);
                } else if (value === '.') {
                    appendDecimal();
                } else if (value === 'AC') {
                    clearAll();
                } else if (value === '+/-') {
                    toggleSign();
                } else if (value === '%') {
                    percentage();
                } else if (value === '=') {
                    compute();
                } else {
                    // Operation buttons: +, -, *, /
                    setOperation(value);
                }

                updateDisplay();
            });

            function appendNumber(number) {
                if (currentInput === '0' || resetScreen) {
                    currentInput = number;
                    resetScreen = false;
                } else {
                    currentInput += number;
                }
            }

            function appendDecimal() {
                if (resetScreen) {
                    currentInput = '0.';
                    resetScreen = false;
                    return;
                }

                if (!currentInput.includes('.')) {
                    currentInput += '.';
                }
            }

            function clearAll() {
                currentInput = '0';
                previousInput = '';
                operation = null;
            }

            function toggleSign() {
                currentInput = (parseFloat(currentInput) * -1).toString();
            }

            function percentage() {
                currentInput = (parseFloat(currentInput) / 100).toString();
            }

            function setOperation(op) {
                if (operation !== null) compute();
                previousInput = currentInput;
                operation = op;
                resetScreen = true;
            }

            function compute() {
                let computation;
                const prev = parseFloat(previousInput);
                const current = parseFloat(currentInput);

                if (isNaN(prev) || isNaN(current)) return;

                switch (operation) {
                    case '+':
                        computation = prev + current;
                        break;
                    case '-':
                        computation = prev - current;
                        break;
                    case '*':
                        computation = prev * current;
                        break;
                    case '/':
                        computation = prev / current;
                        break;
                    default:
                        return;
                }

                currentInput = computation.toString();
                operation = null;
                resetScreen = true;

                // Update history
                displayHistory.textContent = `${previousInput} ${operation} ${currentInput} =`;
            }

            function updateDisplay() {
                displayCurrent.textContent = currentInput;
            }
        }