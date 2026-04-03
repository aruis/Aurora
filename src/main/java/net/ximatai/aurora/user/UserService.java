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

@Service
@Transactional
public class UserService {

	private final AppUserRepository userRepository;
	private final RoleRepository roleRepository;
	private final PasswordEncoder passwordEncoder;

	public UserService(AppUserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
		this.passwordEncoder = passwordEncoder;
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
		return UserResponse.from(userRepository.save(user));
	}

	public UserResponse update(Long id, UserUpdateRequest request) {
		AppUser user = getUser(id);
		user.setDisplayName(request.displayName());
		user.setEnabled(request.enabled());
		user.setRoles(resolveRoles(request.roles()));
		return UserResponse.from(user);
	}

	public UserResponse enable(Long id) {
		AppUser user = getUser(id);
		user.setEnabled(true);
		return UserResponse.from(user);
	}

	public UserResponse disable(Long id) {
		AppUser user = getUser(id);
		user.setEnabled(false);
		return UserResponse.from(user);
	}

	public void resetPassword(Long id, ResetPasswordRequest request) {
		AppUser user = getUser(id);
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
	}

	private AppUser getUser(Long id) {
		return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("用户不存在"));
	}

	private Set<Role> resolveRoles(Set<RoleCode> roleCodes) {
		List<Role> roles = roleRepository.findByCodeIn(roleCodes);
		if (roles.size() != roleCodes.size()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "角色信息不合法");
		}
		return new LinkedHashSet<>(roles);
	}
}
