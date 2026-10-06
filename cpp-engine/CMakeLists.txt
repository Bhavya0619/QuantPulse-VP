# ----------------------------
# Project Configuration
# ----------------------------

cmake_minimum_required(VERSION 3.20)

project(
    QuantPulseEngine
    VERSION 0.1.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

find_package(nlohmann_json CONFIG REQUIRED)

add_library(
    quantpulse_core
    src/domain/statistics/StatisticsEngine.cpp
    src/domain/returns/ReturnsEngine.cpp
    src/domain/volatility/VolatilityEngine.cpp
    src/domain/risk/RiskEngine.cpp
    src/domain/risk/RiskIntelligenceEngine.cpp
    src/domain/portfolio/PortfolioEngine.cpp
    src/domain/microstructure/MarketMicrostructureEngine.cpp
    src/domain/features/FeatureEngine.cpp
    src/domain/signals/SignalEngine.cpp
    src/domain/strategy/StrategyEngine.cpp
    src/domain/execution/ExecutionEngine.cpp
    src/domain/sizing/PositionSizingEngine.cpp
    src/domain/risk_management/RiskManagementEngine.cpp
    src/domain/trading/TradingEngine.cpp
    src/domain/backtest/BacktestEngine.cpp
    src/domain/performance/PerformanceEngine.cpp
    src/domain/research/ResearchEngine.cpp
    src/domain/portfolio_state/PortfolioStateEngine.cpp
    src/domain/orders/OrderManagementEngine.cpp
    src/domain/transaction_cost/TransactionCostEngine.cpp
    src/domain/market_data/MarketDataEngine.cpp
    src/domain/market_data_buffer/MarketDataBufferEngine.cpp
    src/domain/position/PositionEngine.cpp
    src/domain/indicators/IndicatorEngine.cpp
    src/domain/events/EventBusEngine.cpp
    src/domain/time_series/TimeSeriesEngine.cpp
    src/domain/rolling_window/RollingWindowEngine.cpp
    src/domain/order_book/OrderBookEngine.cpp
    src/domain/matching/MatchingEngine.cpp
    src/domain/latency/LatencyEngine.cpp
    src/domain/order_flow/OrderFlowEngine.cpp
    src/domain/liquidity/LiquidityEngine.cpp
    src/infrastructure/market_data/CsvMarketDataReader.cpp
    src/application/analytics/MarketDataAnalytics.cpp
    src/infrastructure/serialization/MarketAnalyticsJson.cpp
    src/infrastructure/serialization/MarketAnalyticsRequestJson.cpp
    src/application/backtesting/BacktestingApplication.cpp
)

target_include_directories(
    quantpulse_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(
    quantpulse_core
    PUBLIC
        nlohmann_json::nlohmann_json
)

if(MSVC)
    target_compile_options(
        quantpulse_core
        PRIVATE
            /W4
            /FS
    )
else()
    target_compile_options(
        quantpulse_core
        PRIVATE
            -Wall
            -Wextra
            -Wpedantic
    )
endif()

add_executable(
    quantpulse_demo
    src/main.cpp
)

target_link_libraries(
    quantpulse_demo
    PRIVATE
        quantpulse_core
)

add_executable(
    quantpulse_cli
    src/adapter/QuantPulseCLI.cpp
)

target_link_libraries(
    quantpulse_cli
    PRIVATE
        quantpulse_core
)

# ----------------------------
# HTTP Network Server Adapter
# ----------------------------

find_package(Threads REQUIRED)

add_executable(
    quantpulse_server
    src/adapter/QuantPulseHttpServer.cpp
)

target_link_libraries(
    quantpulse_server
    PRIVATE
        quantpulse_core
        Threads::Threads
)

# ----------------------------
# Testing
# ----------------------------

enable_testing()

find_package(GTest REQUIRED)

add_executable(
    quantpulse_tests
    tests/statistics/StatisticsEngineTest.cpp
    tests/returns/ReturnsEngineTest.cpp
    tests/volatility/VolatilityEngineTest.cpp
    tests/risk/RiskEngineTest.cpp
    tests/risk/RiskIntelligenceEngineTest.cpp
    tests/portfolio/PortfolioEngineTest.cpp
    tests/microstructure/MarketMicrostructureEngineTest.cpp
    tests/features/FeatureEngineTest.cpp
    tests/signals/SignalEngineTest.cpp
    tests/strategy/StrategyEngineTest.cpp
    tests/execution/ExecutionEngineTest.cpp
    tests/sizing/PositionSizingEngineTest.cpp
    tests/backtest/BacktestEngineTest.cpp
    tests/risk_management/RiskManagementEngineTest.cpp
    tests/trading/TradingEngineTest.cpp
    tests/performance/PerformanceEngineTest.cpp
    tests/research/ResearchEngineTest.cpp
    tests/portfolio_state/PortfolioStateEngineTest.cpp
    tests/orders/OrderManagementEngineTest.cpp
    tests/transaction_cost/TransactionCostEngineTest.cpp
    tests/market_data/MarketDataEngineTest.cpp
    tests/market_data_buffer/MarketDataBufferEngineTest.cpp
    tests/position/PositionEngineTest.cpp
    tests/indicators/IndicatorEngineTest.cpp
    tests/events/EventBusEngineTest.cpp
    tests/time_series/TimeSeriesEngineTest.cpp
    tests/rolling_window/RollingWindowEngineTest.cpp
    tests/order_book/OrderBookEngineTest.cpp
    tests/matching/MatchingEngineTest.cpp
    tests/latency/LatencyEngineTest.cpp
    tests/integration/EndToEndTradingTest.cpp
    tests/order_flow/OrderFlowEngineTest.cpp
    tests/liquidity/LiquidityEngineTest.cpp
    tests/application/MarketDataAnalyticsTest.cpp
    tests/infrastructure/CsvMarketDataReaderTest.cpp
    tests/infrastructure/MarketAnalyticsJsonTest.cpp
    tests/infrastructure/MarketAnalyticsRequestJsonTest.cpp
    tests/application/BacktestingApplicationTest.cpp
)

target_link_libraries(
    quantpulse_tests
    PRIVATE
        quantpulse_core
        GTest::gtest_main
)

if(MSVC)
    target_compile_options(
        quantpulse_tests
        PRIVATE
            /FS
    )
endif()

include(GoogleTest)

gtest_discover_tests(quantpulse_tests)

# ----------------------------
# Benchmarking
# ----------------------------

set(BENCHMARK_ENABLE_TESTING OFF CACHE BOOL "" FORCE)
set(BENCHMARK_ENABLE_GTEST_TESTS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    google_benchmark
    GIT_REPOSITORY https://github.com/google/benchmark.git
    GIT_TAG v1.9.4
    GIT_SHALLOW TRUE
)

FetchContent_MakeAvailable(google_benchmark)

add_executable(
    quantpulse_benchmarks
    benchmarks/BenchmarkMain.cpp
    benchmarks/statistics/StatisticsEngineBenchmark.cpp
    benchmarks/returns/ReturnsEngineBenchmark.cpp
    benchmarks/volatility/VolatilityEngineBenchmark.cpp
    benchmarks/risk/RiskEngineBenchmark.cpp
    benchmarks/risk/RiskIntelligenceEngineBenchmark.cpp
    benchmarks/portfolio/PortfolioEngineBenchmark.cpp
    benchmarks/microstructure/MarketMicrostructureEngineBenchmark.cpp
    benchmarks/features/FeatureEngineBenchmarks.cpp
    benchmarks/signals/SignalEngineBenchmark.cpp
    benchmarks/strategy/StrategyEngineBenchmark.cpp
    benchmarks/execution/ExecutionEngineBenchmark.cpp
    benchmarks/sizing/PositionSizingEngineBenchmark.cpp
    benchmarks/risk_management/RiskManagementEngineBenchmark.cpp
    benchmarks/trading/TradingEngineBenchmark.cpp
    benchmarks/backtest/BacktestEngineBenchmark.cpp
    benchmarks/performance/PerformanceEngineBenchmark.cpp
    benchmarks/research/ResearchEngineBenchmark.cpp
    benchmarks/portfolio_state/PortfolioStateEngineBenchmark.cpp
    benchmarks/orders/OrderManagementEngineBenchmark.cpp
    benchmarks/transaction_cost/TransactionCostEngineBenchmark.cpp
    benchmarks/market_data/MarketDataEngineBenchmark.cpp
    benchmarks/market_data_buffer/MarketDataBufferEngineBenchmark.cpp
    benchmarks/position/PositionEngineBenchmark.cpp
    benchmarks/indicators/IndicatorEngineBenchmark.cpp
    benchmarks/events/EventBusEngineBenchmark.cpp
    benchmarks/time_series/TimeSeriesEngineBenchmark.cpp
    benchmarks/rolling_window/RollingWindowEngineBenchmark.cpp
    benchmarks/order_book/OrderBookEngineBenchmark.cpp
    benchmarks/matching/MatchingEngineBenchmark.cpp
    benchmarks/latency/LatencyEngineBenchmark.cpp
    benchmarks/order_flow/OrderFlowEngineBenchmark.cpp
    benchmarks/liquidity/LiquidityEngineBenchmark.cpp
    benchmarks/infrastructure/MarketAnalyticsJsonBenchmark.cpp
    benchmarks/application/MarketDataAnalyticsBenchmark.cpp
    benchmarks/infrastructure/CsvMarketDataReaderBenchmark.cpp
    benchmarks/application/BacktestingApplicationBenchmark.cpp
)

target_link_libraries(
    quantpulse_benchmarks
    PRIVATE
        quantpulse_core
        benchmark::benchmark
)
