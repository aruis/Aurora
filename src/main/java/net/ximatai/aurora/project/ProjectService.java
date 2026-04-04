package net.ximatai.aurora.project;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;

@Service
@Transactional
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;

	public ProjectService(ProjectRepository projectRepository, InvoiceRepository invoiceRepository, PaymentRepository paymentRepository) {
		this.projectRepository = projectRepository;
		this.invoiceRepository = invoiceRepository;
		this.paymentRepository = paymentRepository;
	}

	@Transactional(readOnly = true)
	public List<ProjectSummary> list(String name, String customer, String contractNo, LocalDate signingDateStart, LocalDate signingDateEnd) {
		return projectRepository.search(
			blankToNull(name),
			blankToNull(customer),
			blankToNull(contractNo),
			signingDateStart,
			signingDateEnd);
	}

	@Transactional(readOnly = true)
	public ProjectSummary get(Long id) {
		ProjectSummary summary = projectRepository.findSummaryById(id);
		if (summary == null) {
			throw new EntityNotFoundException("项目不存在");
		}
		return summary;
	}

	public ProjectSummary create(ProjectRequest request) {
		Project project = new Project();
		apply(project, request);
		projectRepository.save(project);
		return get(project.getId());
	}

	public ProjectSummary update(Long id, ProjectRequest request) {
		Project project = projectRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("项目不存在"));
		apply(project, request);
		return get(project.getId());
	}

	public void delete(Long id) {
		if (!projectRepository.existsById(id)) {
			throw new EntityNotFoundException("项目不存在");
		}
		if (invoiceRepository.existsByProjectId(id) || paymentRepository.existsByProjectId(id)) {
			throw new BusinessException(HttpStatus.CONFLICT, "项目下存在开票或回款记录，不能删除");
		}
		projectRepository.deleteById(id);
	}

	private void apply(Project project, ProjectRequest request) {
		project.setName(request.name());
		project.setCustomer(request.customer());
		project.setContractNo(request.contractNo());
		project.setSigningDate(request.signingDate());
		project.setContractAmount(request.contractAmount());
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}
}
