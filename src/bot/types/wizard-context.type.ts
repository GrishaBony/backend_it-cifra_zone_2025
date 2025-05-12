import { OpenrouterMessage } from 'src/openrouter/interfaces/openrouter.interface';
import { Scenes } from 'telegraf';

export interface SupportWizardState {
  supportType?: string;
  supportTopic?: string;
}

// Расширяем интерфейс сессии сцены
export interface SceneSession {
  state: SupportWizardState;
  step: string;
}

export interface LLMSceneSession {
  messages: OpenrouterMessage[];
}

// Расширяем WizardContext для поддержки нашей структуры сессии
export type WizardContext = Scenes.SceneContext & {
  scene: Scenes.SceneContextScene<Scenes.SceneContext> & {
    session: SceneSession | LLMSceneSession;
  };
};
