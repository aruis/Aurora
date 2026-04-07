package net.ximatai.aurora.project;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectChangeRepository extends JpaRepository<ProjectChange, Long> {

	List<ProjectChange> findByProjectIdOrderByCreatedAtDescIdDesc(Long projectId);

	boolean existsByProjectId(Long projectId);
}
