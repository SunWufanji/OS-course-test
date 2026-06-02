package com.processos.repository;

import com.processos.model.ScenarioConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 实验配置方案Repository
 */
@Repository
public interface ScenarioConfigRepository extends JpaRepository<ScenarioConfig, Long> {

    List<ScenarioConfig> findByIsDefaultTrue();

    List<ScenarioConfig> findByLoadType(ScenarioConfig.LoadType loadType);

    Optional<ScenarioConfig> findByScenarioName(String scenarioName);
}
