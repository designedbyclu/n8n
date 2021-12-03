import {  ActionContext, Module } from 'vuex';
import {
	IN8nPrompt,
	IN8nUISettings,
	IN8nValueSurveyData,
	IPersonalizationSurveyAnswers,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getPromptsData, getSettings, submitValueSurvey, submitPersonalizationSurvey, submitContactInfo } from '../api/settings';
import Vue from 'vue';
import { getPersonalizedNodeTypes } from './helper';
import { CONTACT_PROMPT_MODAL_KEY, PERSONALIZATION_MODAL_KEY, VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { IDataObject } from 'n8n-workflow';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
		promptsData: {} as IN8nPrompt,
	},
	getters: {
		personalizedNodeTypes(state: ISettingsState): string[] {
			const answers = state.settings.personalizationSurvey && state.settings.personalizationSurvey.answers;
			if (!answers) {
				return [];
			}

			return getPersonalizedNodeTypes(answers);
		},
		getPromptsData(state: ISettingsState) {
			return state.promptsData;
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
		setPersonalizationAnswers(state: ISettingsState, answers: IPersonalizationSurveyAnswers) {
			Vue.set(state.settings, 'personalizationSurvey', {
				answers,
				shouldShow: false,
			});
		},
		setPromptsData(state: ISettingsState, promptsData: IN8nPrompt) {
			Vue.set(state, 'promptsData', promptsData);
		},
	},
	actions: {
		async getSettings(context: ActionContext<ISettingsState, IRootState>) {
			const settings = await getSettings(context.rootGetters.getRestApiContext);
			context.commit('setSettings', settings);

			// todo refactor to this store
			context.commit('setUrlBaseWebhook', settings.urlBaseWebhook, {root: true});
			context.commit('setEndpointWebhook', settings.endpointWebhook, {root: true});
			context.commit('setEndpointWebhookTest', settings.endpointWebhookTest, {root: true});
			context.commit('setSaveDataErrorExecution', settings.saveDataErrorExecution, {root: true});
			context.commit('setSaveDataSuccessExecution', settings.saveDataSuccessExecution, {root: true});
			context.commit('setSaveManualExecutions', settings.saveManualExecutions, {root: true});
			context.commit('setTimezone', settings.timezone, {root: true});
			context.commit('setExecutionTimeout', settings.executionTimeout, {root: true});
			context.commit('setMaxExecutionTimeout', settings.maxExecutionTimeout, {root: true});
			context.commit('setVersionCli', settings.versionCli, {root: true});
			context.commit('setInstanceId', settings.instanceId, {root: true});
			context.commit('setOauthCallbackUrls', settings.oauthCallbackUrls, {root: true});
			context.commit('setN8nMetadata', settings.n8nMetadata || {}, {root: true});
			context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});
			context.commit('setTelemetry', settings.telemetry, {root: true});

			const showPersonalizationsModal = settings.personalizationSurvey && settings.personalizationSurvey.shouldShow && !settings.personalizationSurvey.answers;
			if (showPersonalizationsModal) {
				context.commit('ui/openModal', PERSONALIZATION_MODAL_KEY, {root: true});
			}
			return settings;
		},
		async submitPersonalizationSurvey(context: ActionContext<ISettingsState, IRootState>, results: IPersonalizationSurveyAnswers) {
			await submitPersonalizationSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setPersonalizationAnswers', results);
		},
		async fetchPromptsData(context: ActionContext<ISettingsState, IRootState>) {
			try {
				const promptsData = await getPromptsData(context.state.settings.instanceId);

				if (promptsData.showPrompt) {
					context.commit('ui/openModal', CONTACT_PROMPT_MODAL_KEY, {root: true});
				} else if (promptsData.showValueSurvey) {
					context.commit('ui/openModal', VALUE_SURVEY_MODAL_KEY, {root: true});
				}

				context.commit('setPromptsData', promptsData);
			} catch (e) {
				return;
			}
		},
		async submitContactInfo(context: ActionContext<ISettingsState, IRootState>, email: string) {
			try {
				await submitContactInfo(context.state.settings.instanceId, email);
			} catch (e) {
				return;
			}
		},
		async submitValueSurvey(context: ActionContext<ISettingsState, IRootState>, params: IN8nValueSurveyData) {
			try {
				await submitValueSurvey(context.state.settings.instanceId, params);
			} catch (e) {
				return;
			}
		},
	},
};

export default module;
