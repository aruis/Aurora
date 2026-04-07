package net.ximatai.aurora.project;

import java.time.LocalDateTime;

public record ProjectChangeResponse(
	Long id,
	String summary,
	String detail,
	Long operatorId,
	String operatorUsername,
	String operatorDisplayName,
	LocalDateTime createdAt
) {

	public static ProjectChangeResponse from(ProjectChange change) {
		return new ProjectChangeResponse(
			change.getId(),
			change.getSummary(),
			change.getDetail(),
			change.getOperatorId(),
			change.getOperatorUsername(),
			change.getOperatorDisplayName(),
			change.getCreatedAt()
		);
	}
}
