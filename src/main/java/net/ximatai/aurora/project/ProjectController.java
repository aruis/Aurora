package net.ximatai.aurora.project;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

	private final ProjectService projectService;

	public ProjectController(ProjectService projectService) {
		this.projectService = projectService;
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
	public List<ProjectSummary> list(@RequestParam(required = false) String name,
		@RequestParam(required = false) String customer,
		@RequestParam(required = false) String contractNo,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signingDateStart,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate signingDateEnd) {
		return projectService.list(name, customer, contractNo, signingDateStart, signingDateEnd);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
	public ProjectDetailResponse get(@PathVariable Long id) {
		return projectService.get(id);
	}

	@PostMapping
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
	public ProjectSummary create(@Valid @RequestBody ProjectRequest request) {
		return projectService.create(request);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
	public ProjectSummary update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
		return projectService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
	public void delete(@PathVariable Long id) {
		projectService.delete(id);
	}
}
