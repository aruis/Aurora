package net.ximatai.aurora.project;

import java.util.List;

public record FinanceStatsResponse(
	FinanceStatsSummary summary,
	List<FinanceStatsProjectRow> projects
) {
}
