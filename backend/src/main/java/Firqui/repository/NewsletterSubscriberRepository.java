package Firqui.repository;

import Firqui.entity.NewsletterSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, Long> {

    boolean existsByEmailIgnoreCase(String email);

    List<NewsletterSubscriber> findAllByOrderBySubscribedAtDesc();
}
