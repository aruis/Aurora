package net.ximatai.aurora.project;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, Long> {

	@Query("""
		select new net.ximatai.aurora.project.ProjectSummary(
			p.id,
			p.name,
			p.customer,
			p.contractNo,
			p.signingDate,
			p.contractAmount,
			coalesce((select sum(i.amount) from Invoice i where i.project = p), 0),
			coalesce((select sum(pay.amount) from Payment pay where pay.project = p), 0)
		)
		from Project p
		where (:name is null or p.name like concat('%', :name, '%'))
		  and (:customer is null or p.customer like concat('%', :customer, '%'))
		  and (:contractNo is null or p.contractNo like concat('%', :contractNo, '%'))
		  and (:signingDateStart is null or p.signingDate >= :signingDateStart)
		  and (:signingDateEnd is null or p.signingDate <= :signingDateEnd)
		order by p.id desc
		""")
	List<ProjectSummary> search(String name, String customer, String contractNo, LocalDate signingDateStart, LocalDate signingDateEnd);

	@Query("""
		select new net.ximatai.aurora.project.ProjectSummary(
			p.id,
			p.name,
			p.customer,
			p.contractNo,
			p.signingDate,
			p.contractAmount,
			coalesce((select sum(i.amount) from Invoice i where i.project = p), 0),
			coalesce((select sum(pay.amount) from Payment pay where pay.project = p), 0)
		)
		from Project p
		where p.id = :id
		""")
	ProjectSummary findSummaryById(Long id);
}
