package net.ximatai.aurora.project;

import java.time.LocalDate;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance-stats")
public class FinanceStatsController {

	private final FinanceStatsService financeStatsService;

	public FinanceStatsController(FinanceStatsService financeStatsService) {
		this.financeStatsService = financeStatsService;
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
	public FinanceStatsResponse get(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate) {
		return financeStatsService.get(startDate, endDate);
	}
}
