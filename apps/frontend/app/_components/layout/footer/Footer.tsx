import FooterNav from './FooterNav';
import SocialLinks from './SocialLinks';
import Copyright from './Copyright';

export default function Footer() {
  return (
    <footer className="mt-auto bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <FooterNav />
          </div>
          <div className="shrink-0">
            <SocialLinks />
          </div>
        </div>
      </div>
      <Copyright />
    </footer>
  );
}
