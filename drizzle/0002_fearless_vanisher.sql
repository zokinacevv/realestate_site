ALTER TABLE `organizations` ADD `registration_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_registration_number_unique` ON `organizations` (`registration_number`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `account_type` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `onboarding_completed_at` text;--> statement-breakpoint
UPDATE `profiles`
SET
  `account_type` = CASE
    WHEN EXISTS (
      SELECT 1
      FROM `organization_members`
      INNER JOIN `organizations`
        ON `organization_members`.`organization_id` = `organizations`.`id`
      WHERE `organization_members`.`user_id` = `profiles`.`id`
        AND `organization_members`.`role` IN ('owner', 'editor')
        AND `organizations`.`kind` = 'agency'
    ) THEN 'agency'
    WHEN EXISTS (
      SELECT 1
      FROM `organization_members`
      INNER JOIN `organizations`
        ON `organization_members`.`organization_id` = `organizations`.`id`
      WHERE `organization_members`.`user_id` = `profiles`.`id`
        AND `organization_members`.`role` IN ('owner', 'editor')
        AND `organizations`.`kind` = 'developer'
    ) THEN 'company'
  END,
  `onboarding_completed_at` = CURRENT_TIMESTAMP
WHERE `account_type` IS NULL
  AND EXISTS (
    SELECT 1
    FROM `organization_members`
    WHERE `organization_members`.`user_id` = `profiles`.`id`
      AND `organization_members`.`role` IN ('owner', 'editor')
  );
