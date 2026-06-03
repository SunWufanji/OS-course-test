package com.processos.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 实验配置方案表
 */
@Entity
@Table(name = "scenario_config")
public class ScenarioConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scenario_name", nullable = false)
    private String scenarioName;

    private String description;

    @Column(name = "process_count", nullable = false)
    private Integer processCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "load_type", nullable = false)
    private LoadType loadType;

    @Column(name = "config_json", nullable = false, columnDefinition = "JSON")
    private String configJson;

    @Column(name = "is_default")
    private Boolean isDefault;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum LoadType {
        light, medium, heavy
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public ScenarioConfig() {}

    public ScenarioConfig(String scenarioName, String description, Integer processCount,
                          LoadType loadType, String configJson, Boolean isDefault) {
        this.scenarioName = scenarioName;
        this.description = description;
        this.processCount = processCount;
        this.loadType = loadType;
        this.configJson = configJson;
        this.isDefault = isDefault;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getScenarioName() { return scenarioName; }
    public void setScenarioName(String scenarioName) { this.scenarioName = scenarioName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getProcessCount() { return processCount; }
    public void setProcessCount(Integer processCount) { this.processCount = processCount; }

    public LoadType getLoadType() { return loadType; }
    public void setLoadType(LoadType loadType) { this.loadType = loadType; }

    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
