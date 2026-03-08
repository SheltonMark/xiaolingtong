#!/bin/bash
echo "Running all performance tests..."
echo "1. Running auth performance tests..."
k6 run test/performance/auth-performance.js
echo "2. Running post performance tests..."
k6 run test/performance/post-performance.js
echo "3. Running payment performance tests..."
k6 run test/performance/payment-performance.js
echo "4. Running search performance tests..."
k6 run test/performance/search-performance.js
echo "All performance tests completed!"
