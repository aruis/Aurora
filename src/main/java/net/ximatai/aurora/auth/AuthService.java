package net.ximatai.aurora.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.user.AppUser;
import net.ximatai.aurora.user.AppUserRepository;

@Service
@Transactional
public class AuthService {

	private final AppUserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public AuthService(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public void changePassword(Long userId, ChangePasswordRequest request) {
		AppUser user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("用户不存在"));
		if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "原密码不正确");
		}
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
	}
}
