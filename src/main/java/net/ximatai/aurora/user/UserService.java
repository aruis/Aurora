package net.ximatai.aurora.user;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.common.RoleCode;
import net.ximatai.aurora.operationlog.OperationLogService;

@Service
@Transactional
public class UserService {

	private final AppUserRepository userRepository;
	private final RoleRepository roleRepository;
	private final PasswordEncoder passwordEncoder;
	private final OperationLogService operationLogService;

	public UserService(AppUserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder,
		OperationLogService operationLogService) {
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
		this.passwordEncoder = passwordEncoder;
		this.operationLogService = operationLogService;
	}

	@Transactional(readOnly = true)
	public List<UserResponse> list() {
		return userRepository.findAll().stream().map(UserResponse::from).toList();
	}

	public UserResponse create(UserCreateRequest request) {
		if (userRepository.existsByUsername(request.username())) {
			throw new BusinessException(HttpStatus.CONFLICT, "用户名已存在");
		}

		AppUser user = new AppUser();
		user.setUsername(request.username());
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setDisplayName(request.displayName());
		user.setEnabled(request.enabled());
		user.setRoles(resolveRoles(request.roles()));
		AppUser savedUser = userRepository.save(user);
		operationLogService.log("用户管理", "创建用户", "用户", String.valueOf(savedUser.getId()), savedUser.getUsername(),
			"角色=" + String.join(", ", request.roles().stream().map(Enum::name).sorted().toList()));
		return UserResponse.from(savedUser);
	}

	public UserResponse update(Long id, UserUpdateRequest request) {
		AppUser user = getUser(id);
		assertAdminUserCannotBeDisabled(user, request.enabled());
		user.setDisplayName(request.displayName());
		user.setEnabled(request.enabled());
		user.setRoles(resolveRoles(request.roles()));
		operationLogService.log("用户管理", "编辑用户", "用户", String.valueOf(user.getId()), user.getUsername(),
			"启用=" + user.isEnabled() + "，角色=" + String.join(", ", request.roles().stream().map(Enum::name).sorted().toList()));
		return UserResponse.from(user);
	}

	public UserResponse enable(Long id) {
		AppUser user = getUser(id);
		user.setEnabled(true);
		operationLogService.log("用户管理", "启用用户", "用户", String.valueOf(user.getId()), user.getUsername(), "用户已启用");
		return UserResponse.from(user);
	}

	public UserResponse disable(Long id) {
		AppUser user = getUser(id);
		assertAdminUserCannotBeDisabled(user, false);
		user.setEnabled(false);
		operationLogService.log("用户管理", "停用用户", "用户", String.valueOf(user.getId()), user.getUsername(), "用户已停用");
		return UserResponse.from(user);
	}

	public void resetPassword(Long id, ResetPasswordRequest request) {
		AppUser user = getUser(id);
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		operationLogService.log("用户管理", "重置密码", "用户", String.valueOf(user.getId()), user.getUsername(), "管理员重置了用户密码");
	}

	private AppUser getUser(Long id) {
		return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("用户不存在"));
	}

	private void assertAdminUserCannotBeDisabled(AppUser user, boolean enabled) {
		if ("admin".equalsIgnoreCase(user.getUsername()) && !enabled) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "admin 用户不允许被禁用");
		}
	}

	private Set<Role> resolveRoles(Set<RoleCode> roleCodes) {
		List<Role> roles = roleRepository.findByCodeIn(roleCodes);
		if (roles.size() != roleCodes.size()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "角色信息不合法");
		}
		return new LinkedHashSet<>(roles);
	}
}
