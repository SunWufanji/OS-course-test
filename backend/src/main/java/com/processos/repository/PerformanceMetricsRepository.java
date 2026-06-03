package com.processos.repository;

import com.processos.model.PerformanceMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 调度结果评估Repository
 */
@Repository
public interface PerformanceMetricsRepository extends JpaRepository<PerformanceMetrics, Long> {

    List<PerformanceMetrics> findBySessionId(String sessionId);

    List<PerformanceMetrics> findByAlgorithm(String algorithm);

    List<PerformanceMetrics> findByScenarioId(Long scenarioId);

    List<PerformanceMetrics> findTop10ByOrderByCreatedAtDesc();

    List<PerformanceMetrics> findByAlgorithmAndScenarioId(String algorithm, Long scenarioId);

    void deleteBySessionId(String sessionId);
}
