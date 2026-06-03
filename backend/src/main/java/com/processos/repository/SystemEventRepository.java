package com.processos.repository;

import com.processos.model.SystemEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemEventRepository extends JpaRepository<SystemEvent, Long> {

    Page<SystemEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<SystemEvent> findByLevelOrderByCreatedAtDesc(String level, Pageable pageable);

    Page<SystemEvent> findBySourceOrderByCreatedAtDesc(String source, Pageable pageable);

    Page<SystemEvent> findByLevelAndSourceOrderByCreatedAtDesc(String level, String source, Pageable pageable);

    Page<SystemEvent> findByMessageContainingIgnoreCaseOrderByCreatedAtDesc(String keyword, Pageable pageable);

    Page<SystemEvent> findByLevelAndMessageContainingIgnoreCaseOrderByCreatedAtDesc(
        String level, String keyword, Pageable pageable);

    List<SystemEvent> findTop50ByOrderByCreatedAtDesc();

    void deleteAllByOrderByCreatedAtDesc();
}
