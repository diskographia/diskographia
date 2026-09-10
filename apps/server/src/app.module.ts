import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { EntitiesModule } from './modules/entities/entities.module.js';
import { FeedModule } from './modules/feed/feed.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { InteractionModule } from './modules/interaction/interaction.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ParticipationModule } from './modules/participation/participation.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { TagsModule } from './modules/tags/tags.module.js';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    IdentityModule,
    AccessModule,
    AdminModule,
    TagsModule,
    EntitiesModule,
    MediaModule,
    NotificationsModule,
    InteractionModule,
    ProfilesModule,
    ParticipationModule,
    FeedModule,
    FeedbackModule,
    SearchModule,
  ],
})
export class AppModule {}
