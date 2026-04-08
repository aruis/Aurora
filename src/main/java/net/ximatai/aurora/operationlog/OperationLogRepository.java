package net.ximatai.aurora.operationlog;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OperationLogRepository extends JpaRepository<OperationLog, Long> {

	@Query("""
		select l from OperationLog l
		where l.operatedAt >= :cutoff
		  and (:operatorUsername is null or l.operatorUsername like concat('%', :operatorUsername, '%'))
		  and (:moduleName is null or l.moduleName = :moduleName)
		  and (:actionName is null or l.actionName like concat('%', :actionName, '%'))
		order by l.operatedAt desc, l.id desc
		""")
	List<OperationLog> searchRecent(@Param("cutoff") LocalDateTime cutoff,
		@Param("operatorUsername") String operatorUsername,
		@Param("moduleName") String moduleName,
		@Param("actionName") String actionName);

	@Modifying
	@Query(value = "delete from operation_logs where operated_at < :cutoff", nativeQuery = true)
	long deleteExpiredBefore(@Param("cutoff") long cutoff);
}
