package com.processos.repository;

import com.processos.model.ExecutionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 进程执行轨迹Repository
 */
@Repository
public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, Long> {

    List<ExecutionLog> findBySessionId(String sessionId);

    List<ExecutionLog> findByAlgorithm(String algorithm);

    List<ExecutionLog> findBySessionIdAndAlgorithm(String sessionId, String algorithm);

    List<ExecutionLog> findTop10ByOrderByCreatedAtDesc();

    void deleteBySessionId(String sessionId);
}
