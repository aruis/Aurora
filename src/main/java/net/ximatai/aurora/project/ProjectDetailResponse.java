package net.ximatai.aurora.project;

import java.util.List;

public record ProjectDetailResponse(
	ProjectSummary project,
	List<ProjectChangeResponse> changes
) {
}
