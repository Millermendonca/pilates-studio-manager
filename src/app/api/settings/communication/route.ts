import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_COMMUNICATION_RULES,
  CommunicationRule,
  GatewaySettings,
  renderMessageTemplate,
} from '@/lib/communication';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.studioSettings.findFirst();
    if (!settings) {
      settings = await prisma.studioSettings.create({
        data: {},
      });
    }

    let customRules: CommunicationRule[] = [];
    if (settings.communicationRulesJson) {
      try {
        customRules = JSON.parse(settings.communicationRulesJson);
      } catch (err) {
        console.error('Erro ao ler communicationRulesJson:', err);
      }
    }

    // Mesclar regras salvas com o catálogo padrão para garantir que novos eventos existam sempre
    const mergedRules = DEFAULT_COMMUNICATION_RULES.map((defaultRule) => {
      const found = customRules.find((c) => c.id === defaultRule.id);
      if (!found) return defaultRule;

      return {
        ...defaultRule,
        enabled: found.enabled !== undefined ? found.enabled : defaultRule.enabled,
        channels: found.channels || defaultRule.channels,
        template: found.template || defaultRule.template,
        emailSubject: found.emailSubject || defaultRule.emailSubject,
      };
    });

    let gateways: GatewaySettings = {};
    if (settings.gatewaySettingsJson) {
      try {
        gateways = JSON.parse(settings.gatewaySettingsJson);
      } catch (err) {
        console.error('Erro ao ler gatewaySettingsJson:', err);
      }
    }

    return NextResponse.json({
      rules: mergedRules,
      gateways,
      studioName: settings.studioName,
      whatsappNumber: settings.whatsapp,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de comunicação:', error);
    return NextResponse.json({ error: 'Erro ao carregar regras de comunicação' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { rules, gateways } = body;

    let settings = await prisma.studioSettings.findFirst();
    if (!settings) {
      settings = await prisma.studioSettings.create({ data: {} });
    }

    // Se a regra de pré-cadastro for atualizada, atualizar também o campo de compatibilidade whatsappInviteTemplate
    const preRegRule = rules?.find((r: CommunicationRule) => r.id === 'PRE_REGISTRATION_INVITE');

    await prisma.studioSettings.update({
      where: { id: settings.id },
      data: {
        communicationRulesJson: JSON.stringify(rules || []),
        gatewaySettingsJson: JSON.stringify(gateways || {}),
        ...(preRegRule?.template && { whatsappInviteTemplate: preRegRule.template }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configurações e regras de comunicação salvas com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao salvar regras de comunicação:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ruleId, template, variables, channel, studentPhone } = body;

    const rendered = renderMessageTemplate(template, variables || {});

    return NextResponse.json({
      success: true,
      rendered,
      simulatedChannel: channel || 'WHATSAPP',
      sentAt: new Date().toISOString(),
      recipient: studentPhone || '(22) 99850-5276',
    });
  } catch (error) {
    console.error('Erro ao simular envio:', error);
    return NextResponse.json({ error: 'Erro ao simular template' }, { status: 500 });
  }
}
